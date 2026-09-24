import { describe, expect, it, vi } from "vitest"
import { defaultLogPolicy } from "../logging/config"
import type { DiagnosticsStrategy } from "./contracts"
import { createDiagnosticsDispatcher } from "./dispatcher"
import { parseDiagnosticsConfig, startDiagnostics } from "./runtime"

const sentryDsn = "https://publickey@o1.ingest.example.io/42"
const betterStack = {
  DIAGNOSTICS_PROVIDER: "better-stack",
  BETTER_STACK_ERRORS_DSN: "https://errortoken@errors.example.com/1",
  BETTER_STACK_LOGS_URL: "https://s1.logs.example.com",
  BETTER_STACK_LOGS_TOKEN: "source-token-secret",
}
const strategy: DiagnosticsStrategy = {
  log: () => {},
  reportError: () => {},
  flush: async () => {},
}

function setup() {
  const notice = vi.fn()
  const dispatcher = createDiagnosticsDispatcher({
    policy: () => defaultLogPolicy,
    notice,
  })
  const adapters = {
    sentry: vi.fn(async () => strategy),
    "better-stack": vi.fn(async () => strategy),
  }
  return { notice, dispatcher, adapters }
}

describe("TST-DIAGNOSTICS-001 startup selection", () => {
  it.each([{}, { DIAGNOSTICS_PROVIDER: "none", SENTRY_DSN: sentryDsn }])(
    "selects none without loading any provider adapter: %o",
    async (environment) => {
      const { dispatcher, adapters, notice } = setup()
      expect(parseDiagnosticsConfig(environment)).toEqual({ provider: "none" })
      await expect(
        startDiagnostics(dispatcher, adapters, environment)
      ).resolves.toBe("none")
      expect(adapters.sentry).not.toHaveBeenCalled()
      expect(adapters["better-stack"]).not.toHaveBeenCalled()
      expect(dispatcher.active()).toBe(false)
      expect(notice).not.toHaveBeenCalled()
    }
  )

  it("loads exactly the selected provider once with startup-only credentials and release", async () => {
    const { dispatcher, adapters } = setup()
    const environment = {
      DIAGNOSTICS_PROVIDER: "sentry",
      SENTRY_DSN: sentryDsn,
      APP_ENV: "preview",
      VERCEL_GIT_COMMIT_SHA: "0123456789abcdef0123456789abcdef01234567",
      ...Object.fromEntries(
        Object.entries(betterStack).filter(
          ([key]) => key !== "DIAGNOSTICS_PROVIDER"
        )
      ),
    }
    await expect(
      startDiagnostics(dispatcher, adapters, environment)
    ).resolves.toBe("sentry")
    expect(adapters.sentry).toHaveBeenCalledExactlyOnceWith(
      {
        provider: "sentry",
        dsn: sentryDsn,
        environment: "preview",
        release: "0123456789abcdef0123456789abcdef01234567",
      },
      dispatcher.gate,
      dispatcher.notice
    )
    expect(adapters["better-stack"]).not.toHaveBeenCalled()
    expect(dispatcher.active()).toBe(true)
    await startDiagnostics(dispatcher, adapters, environment)
    expect(adapters.sentry).toHaveBeenCalledOnce()
  })

  it("omits an unsafe release value instead of forwarding it", () => {
    expect(
      parseDiagnosticsConfig({
        DIAGNOSTICS_PROVIDER: "sentry",
        SENTRY_DSN: sentryDsn,
        VERCEL_GIT_COMMIT_SHA: "main; person@example.com",
      })
    ).toEqual({ provider: "sentry", dsn: sentryDsn, environment: "local" })
  })

  it("requires every Better Stack path and loads only that adapter", async () => {
    const { dispatcher, adapters } = setup()
    expect(parseDiagnosticsConfig(betterStack)).toMatchObject({
      provider: "better-stack",
      errorsDsn: betterStack.BETTER_STACK_ERRORS_DSN,
      logsUrl: betterStack.BETTER_STACK_LOGS_URL,
      logsToken: betterStack.BETTER_STACK_LOGS_TOKEN,
      environment: "local",
    })
    await startDiagnostics(dispatcher, adapters, betterStack)
    expect(adapters["better-stack"]).toHaveBeenCalledOnce()
    expect(adapters.sentry).not.toHaveBeenCalled()
  })

  it.each([
    { DIAGNOSTICS_PROVIDER: "sentry" },
    {
      DIAGNOSTICS_PROVIDER: "sentry",
      SENTRY_DSN: "http://key@insecure.example/1",
    },
    { DIAGNOSTICS_PROVIDER: "sentry", SENTRY_DSN: "https://nokey.example/1" },
    { DIAGNOSTICS_PROVIDER: "sentry", SENTRY_DSN: `${sentryDsn}?debug=1` },
    { DIAGNOSTICS_PROVIDER: "sentry", SENTRY_DSN: "not a url" },
    { ...betterStack, BETTER_STACK_LOGS_TOKEN: "" },
    {
      ...betterStack,
      BETTER_STACK_LOGS_URL: "https://s1.logs.example.com/?x=1",
    },
    { DIAGNOSTICS_PROVIDER: "datadog" },
  ])(
    "refuses invalid selected configuration without fallback or leaking values: %o",
    async (environment) => {
      const { dispatcher, adapters, notice } = setup()
      const other = { ...environment, ...betterStack, ...environment }
      await expect(startDiagnostics(dispatcher, adapters, other)).resolves.toBe(
        "disabled"
      )
      expect(adapters.sentry).not.toHaveBeenCalled()
      expect(adapters["better-stack"]).not.toHaveBeenCalled()
      expect(dispatcher.active()).toBe(false)
      expect(notice.mock.calls).toEqual([["config_invalid"]])
    }
  )

  it("disables export and notices locally when the selected adapter is missing or fails", async () => {
    const missing = setup()
    await expect(
      startDiagnostics(missing.dispatcher, {}, betterStack)
    ).resolves.toBe("disabled")
    expect(missing.notice.mock.calls).toEqual([["provider_unavailable"]])
    const failing = setup()
    failing.adapters["better-stack"].mockRejectedValueOnce(
      new Error(`bad token ${betterStack.BETTER_STACK_LOGS_TOKEN}`)
    )
    await expect(
      startDiagnostics(failing.dispatcher, failing.adapters, betterStack)
    ).resolves.toBe("disabled")
    expect(failing.dispatcher.active()).toBe(false)
    expect(failing.notice.mock.calls).toEqual([["provider_unavailable"]])
    expect(failing.adapters.sentry).not.toHaveBeenCalled()
  })
})

describe("TST-DIAGNOSTICS-002 startup adapter map", () => {
  it("builds each selected provider strategy lazily without sending anything", async () => {
    const { diagnosticsAdapters } = await import("./adapters")
    const gate = { allowsLog: () => true, allowsReport: () => true }
    const notice = vi.fn()
    const sentry = await diagnosticsAdapters.sentry!(
      { provider: "sentry", dsn: sentryDsn, environment: "local" },
      gate,
      notice
    )
    const betterStackStrategy = await diagnosticsAdapters["better-stack"]!(
      {
        provider: "better-stack",
        errorsDsn: betterStack.BETTER_STACK_ERRORS_DSN,
        logsUrl: betterStack.BETTER_STACK_LOGS_URL,
        logsToken: betterStack.BETTER_STACK_LOGS_TOKEN,
        environment: "local",
      },
      gate,
      notice
    )
    for (const built of [sentry, betterStackStrategy])
      expect(Object.keys(built).sort()).toEqual(["flush", "log", "reportError"])
    await sentry.flush(10)
    await betterStackStrategy.flush(10)
    expect(notice).not.toHaveBeenCalled()
  })
})

describe("TST-DIAGNOSTICS-001 local collector endpoints", () => {
  const loopback = "http://publickey@127.0.0.1:4318/1"
  it("accepts plain-HTTP loopback endpoints only for the local environment", () => {
    expect(
      parseDiagnosticsConfig({
        APP_ENV: "local",
        DIAGNOSTICS_PROVIDER: "sentry",
        SENTRY_DSN: loopback,
      })
    ).toMatchObject({ provider: "sentry", dsn: loopback })
    for (const environment of [
      { APP_ENV: "development", SENTRY_DSN: loopback },
      { APP_ENV: "production", SENTRY_DSN: loopback },
      { APP_ENV: "local", SENTRY_DSN: "http://publickey@collector.example/1" },
    ])
      expect(
        parseDiagnosticsConfig({
          ...environment,
          DIAGNOSTICS_PROVIDER: "sentry",
        })
      ).toEqual({ provider: "invalid" })
    expect(
      parseDiagnosticsConfig({
        ...betterStack,
        APP_ENV: "preview",
        BETTER_STACK_LOGS_URL: "http://localhost:4319",
      })
    ).toEqual({ provider: "invalid" })
  })
})
