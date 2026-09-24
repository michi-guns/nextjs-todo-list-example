import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http"
import type { AddressInfo } from "node:net"
import { createClient } from "next-sanity"
import { afterEach, describe, expect, it } from "vitest"

import { createPublishedLandingProbe } from "./sanity-landing-health"

const LANDING = {
  _id: "landingPage",
  _type: "landingPage",
  headline: "Make progress visible.",
  blurb: "Keep personal tasks clear.",
  primaryCtaLabel: "Get started",
}

type Behavior = (request: IncomingMessage, response: ServerResponse) => void
const closers: Array<() => Promise<void>> = []

/** Controlled Sanity-compatible HTTP API on loopback. */
async function cms(behavior: Behavior) {
  const requests: string[] = []
  let closedEarly = 0
  const server = createServer((request, response) => {
    requests.push(request.url ?? "")
    response.on("close", () => {
      if (!response.writableFinished) closedEarly += 1
    })
    behavior(request, response)
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const { port } = server.address() as AddressInfo
  closers.push(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      })
  )
  const client = createClient({
    projectId: "probe-project",
    dataset: "production",
    apiVersion: "2026-08-27",
    useCdn: false,
    apiHost: `http://127.0.0.1:${port}`,
    // Loopback API: no project subdomain.
    useProjectHostname: false,
  })
  return { client, requests, closedEarly: () => closedEarly }
}

const json =
  (body: unknown, status = 200): Behavior =>
  (_, response) => {
    response.writeHead(status, { "content-type": "application/json" })
    response.end(JSON.stringify(body))
  }

afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()))
})

describe("TST-RUNTIME-001 CMS probe against a controlled HTTP API", () => {
  it("reads fresh published content on every probe, never from a cache", async () => {
    const api = await cms(json({ result: LANDING, ms: 1 }))
    const probe = createPublishedLandingProbe(api.client)
    await expect(probe()).resolves.toEqual({ status: "ok" })
    await expect(probe()).resolves.toEqual({ status: "ok" })
    expect(api.requests).toHaveLength(2)
    for (const url of api.requests) {
      expect(url).toMatch(/^\/v2026-08-27\/data\/query\/production\?/)
      expect(url).toContain("perspective=published")
    }
  })

  it("distinguishes missing or invalid published content from an outage", async () => {
    const empty = await cms(json({ result: null, ms: 1 }))
    await expect(createPublishedLandingProbe(empty.client)()).resolves.toEqual({
      status: "unavailable",
      code: "invalid_content",
    })
    const failing = await cms(json({ error: "internal" }, 500))
    await expect(
      createPublishedLandingProbe(failing.client)()
    ).resolves.toEqual({ status: "unavailable", code: "unreachable" })
  })

  it("aborts a hanging CMS request at the deadline", async () => {
    const hanging = await cms(() => {
      /* never answers */
    })
    const started = performance.now()
    await expect(
      createPublishedLandingProbe(hanging.client, { deadlineMs: 200 })()
    ).resolves.toEqual({ status: "unavailable", code: "timeout" })
    expect(performance.now() - started).toBeLessThan(1_000)
    // The request itself was cancelled, not abandoned behind the response.
    await expect.poll(() => hanging.closedEarly(), { timeout: 2_000 }).toBe(1)
  })
})
