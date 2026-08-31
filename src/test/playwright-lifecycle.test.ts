import { createServer } from "node:net"

import { afterEach, describe, expect, it, vi } from "vitest"

import {
  assertPortAvailable,
  createPlaywrightRuntimeEnvironment,
  PLAYWRIGHT_BASE_URL,
  runCleanupSteps,
  waitForServerReady,
} from "./playwright-lifecycle"

const servers: ReturnType<typeof createServer>[] = []

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve())
        })
    )
  )
})

describe("Playwright local runtime", () => {
  it("creates an explicit development/test environment for the server and workers", () => {
    expect(
      createPlaywrightRuntimeEnvironment(
        "postgresql://postgres@127.0.0.1:5432/todo_test",
        "C:/Temp/playwright-mailbox"
      )
    ).toEqual({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://postgres@127.0.0.1:5432/todo_test",
      BETTER_AUTH_URL: PLAYWRIGHT_BASE_URL,
      BETTER_AUTH_SECRET:
        "playwright-local-test-secret-do-not-use-outside-tests",
      BETTER_AUTH_LOCAL_MAILBOX: "true",
      BETTER_AUTH_MAILBOX_DIR: "C:/Temp/playwright-mailbox",
      PLAYWRIGHT_E2E: "true",
    })
  })

  it("waits through transient connection failures until the server responds", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("not listening"))
      .mockResolvedValueOnce(new Response("warming", { status: 503 }))
      .mockResolvedValueOnce(new Response("ready", { status: 200 }))

    await expect(
      waitForServerReady(PLAYWRIGHT_BASE_URL, {
        fetchImpl,
        pollIntervalMs: 0,
        timeoutMs: 100,
      })
    ).resolves.toBeUndefined()
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it("reports a server that never becomes ready", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("connection refused"))

    await expect(
      waitForServerReady(PLAYWRIGHT_BASE_URL, {
        fetchImpl,
        pollIntervalMs: 0,
        timeoutMs: 0,
      })
    ).rejects.toThrow(/Timed out waiting.*connection refused/i)
  })

  it("rejects an occupied reserved port and accepts a free port", async () => {
    const server = createServer()
    servers.push(server)
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("No port")

    await expect(
      assertPortAvailable("127.0.0.1", address.port)
    ).rejects.toThrow(/already in use/i)
    await expect(assertPortAvailable("127.0.0.1", 0)).resolves.toBeUndefined()
  })

  it("attempts every cleanup step and reports the first failure", async () => {
    const calls: string[] = []

    await expect(
      runCleanupSteps([
        {
          name: "server",
          run: async () => {
            calls.push("server")
            throw new Error("server stop failed")
          },
        },
        {
          name: "mailbox",
          run: async () => {
            calls.push("mailbox")
          },
        },
        {
          name: "database",
          run: async () => {
            calls.push("database")
          },
        },
      ])
    ).rejects.toThrow(/Failed to clean up server/i)
    expect(calls).toEqual(["server", "mailbox", "database"])
  })
})
