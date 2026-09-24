// Node-only: diagnostics run inside the server logger composition.
import { randomUUID } from "node:crypto"
import { ownValue, sanitizeMetadata } from "../logging/sanitize"
import type {
  SafeContext,
  SafeErrorFacts,
  SafeErrorReport,
  SafeFrame,
} from "./contracts"

const MAX_FRAMES = 10
const MAX_CAUSES = 3
const MAX_STACK_CHARS = 8192
const staticMessages: Record<string, string> = {
  unexpected: "Unexpected failure",
  timeout: "Dependency timeout",
  unavailable: "Dependency unavailable",
  conflict: "Unique constraint conflict",
  constraint: "Foreign key constraint failure",
}
const className = /^[A-Z][A-Za-z0-9]{0,63}$/
const functionName = /^[A-Za-z_$<][\w$.<>]{0,99}$/
const safePath = /^[\w.@()[\]/+:-]{1,200}$/
const frameLine =
  /^\s*at (?:(?:async )?(?:new )?(.+?) \()?(.+?):(\d+):(\d+)\)?$/

/** Error class names come from code; a non-identifier name is not trusted. */
function errorClass(error: unknown): string {
  if (!(error instanceof Error)) return "NonError"
  const constructor = ownValue(Object.getPrototypeOf(error), "constructor")
  const name =
    typeof constructor === "function"
      ? Object.getOwnPropertyDescriptor(constructor, "name")?.value
      : undefined
  return typeof name === "string" && className.test(name) ? name : "Error"
}

function facts(error: unknown): SafeErrorFacts {
  const safe = sanitizeMetadata(
    error instanceof Error ? { error } : { error: {} }
  ).error!
  return {
    class: errorClass(error),
    kind: safe.kind,
    ...(safe.code ? { code: safe.code } : {}),
  }
}

/** Keep repository-relative or package-relative locations, never local absolute paths or URLs. */
function framePath(raw: string, root: string): string | undefined {
  let path = raw.replace(/\\/g, "/").replace(/[?#].*$/, "")
  if (path.startsWith("file://")) {
    path = path.slice(7)
    if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1)
  }
  const modules = path.lastIndexOf("/node_modules/")
  if (path.startsWith("node:")) {
    // Node built-ins are already location-only.
  } else if (modules >= 0) {
    path = path.slice(modules + 1)
  } else if (root && path.startsWith(`${root}/`)) {
    path = path.slice(root.length + 1)
  } else if (path.includes("/.next/")) {
    path = path.slice(path.indexOf("/.next/") + 1)
  } else {
    path = path.slice(path.lastIndexOf("/") + 1)
  }
  return safePath.test(path) && !path.includes("..") ? path : undefined
}

/** Reads the engine stack once, dropping the message line and any unparsed text. */
function frames(error: unknown, root: string): SafeFrame[] {
  if (!(error instanceof Error)) return []
  let stack: unknown
  try {
    stack = Reflect.get(error, "stack")
  } catch {
    return []
  }
  if (typeof stack !== "string") return []
  // Skip the whole header: a multi-line message could imitate a frame line.
  const message = ownValue(error, "message")
  const header = typeof message === "string" ? message.split("\n").length : 1
  const parsed: SafeFrame[] = []
  for (const line of stack
    .slice(0, MAX_STACK_CHARS)
    .split("\n")
    .slice(header)) {
    const match = frameLine.exec(line)
    if (!match) continue
    const file = framePath(match[2], root)
    if (!file) continue
    const fn = match[1]
    parsed.push({
      file,
      ...(fn && functionName.test(fn) ? { function: fn } : {}),
      line: Number(match[3]),
      column: Number(match[4]),
    })
    if (parsed.length === MAX_FRAMES) break
  }
  return parsed
}

function causes(error: unknown): SafeErrorFacts[] {
  const chain: SafeErrorFacts[] = []
  let current = ownValue(error, "cause")
  while (current !== undefined && chain.length < MAX_CAUSES) {
    chain.push(facts(current))
    current = ownValue(current, "cause")
  }
  return chain
}

/**
 * Projects an unknown failure to allowlisted facts. No message, cause text,
 * source text or raw object crosses the diagnostics Strategy boundary.
 */
export function projectErrorReport(
  error: unknown,
  context: SafeContext,
  options: { root?: string } = {}
): SafeErrorReport {
  const root = (options.root ?? process.cwd()).replace(/\\/g, "/")
  const primary = facts(error)
  const located = frames(error, root)
  const top = located[0]
  return {
    ...context,
    timestamp: new Date().toISOString(),
    occurrenceId: randomUUID(),
    error: {
      ...primary,
      message: staticMessages[primary.kind] ?? staticMessages.unexpected,
      frames: located,
    },
    causes: causes(error),
    fingerprint: [
      context.module,
      context.event,
      primary.class,
      primary.code ?? primary.kind,
      top ? `${top.file}:${top.function ?? "?"}` : "no-frame",
    ],
  }
}
