// Node-only. Shared by the Sentry adapter and Better Stack's Sentry-compatible
// error ingestion; loaded only after startup selects one of them.
import { randomUUID } from "node:crypto"
import {
  createEnvelope,
  createStackParser,
  createTransport,
  forEachEnvelopeItem,
  logger,
  Scope,
  type BaseTransportOptions,
  type Envelope,
  type ErrorEvent,
  type Log,
  type Transport,
} from "@sentry/core"
import { ServerRuntimeClient } from "@sentry/core/server"
import type { LogLevel } from "../logging/config"
import type {
  DiagnosticsNotice,
  ExportGate,
  SafeErrorReport,
  SafeLogEvent,
} from "./contracts"

/**
 * Per-request fallback deadline. An awaited flush that times out also aborts
 * every in-flight request, so the flush deadline bounds the actual I/O.
 */
export const REQUEST_TIMEOUT_MS = 1000
/** Constructed events awaiting beforeSend. */
const MAX_PENDING_EVENTS = 100
/** Maximum concurrent/pending envelope requests; excess is dropped by the SDK. */
export const MAX_PENDING_REQUESTS = 10

const ownLogKeys = new Set([
  "module",
  "event",
  "environment",
  "correlation_id",
  "operation",
  "outcome",
  "duration_ms",
  "transport",
  "error.kind",
  "error.code",
  "release",
])
/** Names the attributes the facade itself set; scope attributes cannot forge it. */
const OWN_KEYS = "diagnostics.keys"
const tagKeys = [
  "module",
  "event",
  "operation",
  "correlation_id",
  "error.kind",
  "error.code",
] as const

type Attribute = string | number
function compact(entries: Array<[string, Attribute | undefined]>) {
  return Object.fromEntries(
    entries.filter(
      (entry): entry is [string, Attribute] => entry[1] !== undefined
    )
  )
}

/** Explicit projection of a SafeLogEvent; nothing else becomes an attribute. */
export function logAttributes(event: SafeLogEvent): Record<string, Attribute> {
  const own = compact([
    ["module", event.module],
    ["event", event.event],
    ["environment", event.environment],
    ["correlation_id", event.correlationId],
    ["operation", event.operation],
    ["outcome", event.outcome],
    ["duration_ms", event.durationMs],
    ["transport", event.transport],
    ["error.kind", event.error?.kind],
    ["error.code", event.error?.code],
    ["release", event.release],
  ])
  return { ...own, [OWN_KEYS]: Object.keys(own).join(",") }
}

function toEvent(report: SafeErrorReport): ErrorEvent {
  return {
    type: undefined,
    event_id: report.occurrenceId.replace(/-/g, ""),
    timestamp: Date.parse(report.timestamp) / 1000,
    level: "error",
    platform: "node",
    environment: report.environment,
    ...(report.release ? { release: report.release } : {}),
    fingerprint: [...report.fingerprint],
    tags: compact([
      ["module", report.module],
      ["event", report.event],
      ["operation", report.operation],
      ["correlation_id", report.correlationId],
      ["error.kind", report.error.kind],
      ["error.code", report.error.code],
    ]),
    exception: {
      values: [
        {
          type: report.error.class,
          value: report.error.message,
          mechanism: { type: "generic", handled: true },
          stacktrace: {
            // Sentry expects the outermost frame first and the crashing frame last.
            frames: [...report.error.frames].reverse().map((frame) => ({
              filename: frame.file,
              ...(frame.function ? { function: frame.function } : {}),
              lineno: frame.line,
              colno: frame.column,
              in_app: !/^(node_modules\/|node:|\.next\/)/.test(frame.file),
            })),
          },
        },
      ],
    },
    contexts: {
      diagnostics: {
        occurrence_id: report.occurrenceId,
        // Flat strings survive the SDK's context depth normalization.
        causes: report.causes.map((cause) =>
          [cause.class, cause.kind, cause.code].filter(Boolean).join(":")
        ),
      },
    },
  }
}

/** Final allowlist after SDK enrichment (scope user, breadcrumbs, extra, contexts). */
function allowlistEvent(event: ErrorEvent): ErrorEvent {
  const tags = event.tags ?? {}
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    level: "error",
    platform: "node",
    environment: event.environment,
    ...(event.release ? { release: event.release } : {}),
    fingerprint: event.fingerprint,
    tags: Object.fromEntries(
      tagKeys.flatMap((key) =>
        tags[key] === undefined ? [] : [[key, tags[key]]]
      )
    ),
    exception: event.exception,
    contexts: { diagnostics: event.contexts?.diagnostics },
    ...(event.sdk
      ? { sdk: { name: event.sdk.name, version: event.sdk.version } }
      : {}),
  }
}

type Identity = { environment: string; release?: string }

/**
 * Keeps only the facade's own keys (as listed by the marker) plus SDK identity
 * values that match this client's configuration. Scope attributes merged after
 * `beforeSendLog` therefore cannot add or substitute an allowlisted key.
 */
function finalAttributes<T>(
  attributes: Record<string, T> | undefined,
  identity: Identity,
  keepMarker = false
): Record<string, T> {
  const valueOf = (key: string) => {
    const attribute = attributes?.[key] as unknown
    return attribute && typeof attribute === "object" && "value" in attribute
      ? attribute.value
      : attribute
  }
  const own = String(valueOf(OWN_KEYS) ?? "").split(",")
  return Object.fromEntries(
    Object.entries(attributes ?? {}).filter(
      ([key]) =>
        (ownLogKeys.has(key) && own.includes(key)) ||
        // The transport still needs the marker after beforeSendLog.
        (keepMarker && key === OWN_KEYS) ||
        (key === "sentry.environment" &&
          valueOf(key) === identity.environment) ||
        (key === "sentry.release" &&
          identity.release !== undefined &&
          valueOf(key) === identity.release) ||
        (key === "sentry.timestamp.sequence" &&
          typeof valueOf(key) === "number")
    )
  ) as Record<string, T>
}

function attributeValue(attributes: unknown, key: string): unknown {
  const attribute = (attributes as Record<string, { value?: unknown }>)?.[key]
  return attribute?.value
}

/**
 * The last supported point before transmission: re-evaluates current policy
 * for every buffered item, re-allowlists log attributes added after
 * `beforeSendLog`, drops non-diagnostic item types and the trace header.
 */
function gateEnvelope(
  envelope: Envelope,
  gate: ExportGate,
  identity: Identity
) {
  const items: unknown[] = []
  forEachEnvelopeItem(envelope, (item, type) => {
    const [header, payload] = item as [Record<string, unknown>, unknown]
    if (type === "event") {
      // Also covers any SDK path that bypasses beforeSend.
      const event = allowlistEvent(payload as ErrorEvent)
      const { module, event: name } = event.tags ?? {}
      if (
        typeof module === "string" &&
        typeof name === "string" &&
        gate.allowsReport({ module, event: name })
      )
        items.push([header, event])
    } else if (type === "log") {
      const kept = (
        (payload as { items: Array<Record<string, unknown>> }).items ?? []
      )
        .filter((log) =>
          gate.allowsLog({
            module: String(attributeValue(log.attributes, "module")),
            event: String(attributeValue(log.attributes, "event")),
            level: log.level as LogLevel,
          })
        )
        .map((log) => {
          const attributes = finalAttributes(
            log.attributes as Record<string, unknown>,
            identity
          )
          // One private scope would give every log the same trace; use this
          // log's own request correlation (a server UUID) or a fresh random ID.
          const correlation = String(
            attributeValue(attributes, "correlation_id") ?? ""
          ).replace(/-/g, "")
          return {
            ...log,
            trace_id: /^[0-9a-f]{32}$/.test(correlation)
              ? correlation
              : randomUUID().replace(/-/g, ""),
            attributes,
          }
        })
      if (kept.length > 0)
        items.push([
          { ...header, item_count: kept.length },
          { ...(payload as object), items: kept },
        ])
    }
  })
  if (items.length === 0) return undefined
  const header = envelope[0] as Record<string, unknown>
  return createEnvelope(
    {
      ...(header.event_id ? { event_id: header.event_id } : {}),
      ...(header.sent_at ? { sent_at: header.sent_at } : {}),
      ...(header.sdk ? { sdk: header.sdk } : {}),
    } as Envelope[0],
    items as never
  )
}

function gatedTransport(
  options: BaseTransportOptions,
  gate: ExportGate,
  notice: (code: DiagnosticsNotice) => void,
  identity: Identity
): Transport {
  const inFlight = new Set<AbortController>()
  const inner = createTransport(
    {
      ...options,
      bufferSize: MAX_PENDING_REQUESTS,
      recordDroppedEvent: (reason, category, count) => {
        if (reason === "queue_overflow" || reason === "ratelimit_backoff")
          notice("record_dropped")
        options.recordDroppedEvent(reason, category, count)
      },
    },
    async ({ body }) => {
      const controller = new AbortController()
      inFlight.add(controller)
      try {
        const response = await fetch(options.url, {
          method: "POST",
          body: typeof body === "string" ? body : new Uint8Array(body),
          headers: { "content-type": "application/x-sentry-envelope" },
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          ]),
        })
        if (!response.ok) notice("export_failed")
        await response.body?.cancel()
        return {
          statusCode: response.status,
          headers: {
            "x-sentry-rate-limits": response.headers.get(
              "x-sentry-rate-limits"
            ),
            "retry-after": response.headers.get("retry-after"),
          },
        }
      } finally {
        inFlight.delete(controller)
      }
    }
  )
  return {
    send(envelope) {
      const allowed = gateEnvelope(envelope, gate, identity)
      if (!allowed) return Promise.resolve({})
      return Promise.resolve(inner.send(allowed)).catch(() => {
        notice("export_failed")
        return {}
      })
    },
    async flush(timeout) {
      const drained = await inner.flush(timeout)
      // Deadline reached: stop the actual network work, not only the await.
      if (!drained) for (const controller of inFlight) controller.abort()
      return drained
    },
  }
}

/**
 * One explicit client per process, never registered globally. Automatic
 * capture, integrations, tracing, breadcrumbs and data collection stay off.
 */
export function createSentryCompatibleClient(options: {
  dsn: string
  environment: string
  release?: string
  gate: ExportGate
  notice: (code: DiagnosticsNotice) => void
}) {
  const identity = {
    environment: options.environment,
    release: options.release,
  }
  const constructed = new Map<string, ErrorEvent>()
  const client = new ServerRuntimeClient({
    dsn: options.dsn,
    environment: options.environment,
    release: options.release,
    integrations: [],
    stackParser: createStackParser(),
    traceLifecycle: "static",
    sendClientReports: false,
    attachStacktrace: false,
    maxBreadcrumbs: 0,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      stackFrameVariables: false,
      frameContextLines: 0,
    },
    // Scope tags and fingerprints merge before this hook, so return exactly the
    // event this module constructed rather than filtering the enriched one.
    beforeSend: (event) => {
      const own = event.event_id ? constructed.get(event.event_id) : undefined
      if (event.event_id) constructed.delete(event.event_id)
      return own ?? null
    },
    beforeSendLog: (log: Log) => ({
      level: log.level,
      message: log.message,
      attributes: finalAttributes(log.attributes, identity, true),
    }),
    beforeSendTransaction: () => null,
    transport: (transportOptions) =>
      gatedTransport(transportOptions, options.gate, options.notice, identity),
  })
  client.init()
  // A private scope keeps request context local and avoids global mutation.
  const scope = new Scope()
  scope.setClient(client)
  return {
    log(event: SafeLogEvent) {
      logger[event.level](event.event, logAttributes(event), { scope })
    },
    report(report: SafeErrorReport) {
      const event = toEvent(report)
      constructed.set(event.event_id!, event)
      // Bounded: an event dropped before beforeSend must not accumulate here.
      while (constructed.size > MAX_PENDING_EVENTS)
        constructed.delete(constructed.keys().next().value!)
      client.captureEvent(event, {}, scope)
    },
    async flush(timeoutMs: number) {
      await client.flush(timeoutMs)
    },
  }
}
