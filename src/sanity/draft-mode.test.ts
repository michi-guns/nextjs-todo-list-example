import { createServer } from "node:http"
import type { AddressInfo } from "node:net"

import { createClient } from "next-sanity"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const next = vi.hoisted(() => ({
  enable: vi.fn(),
  disable: vi.fn(),
  cookies: new Map<string, unknown>(),
  redirect: vi.fn((target: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), {
      digest: `NEXT_REDIRECT;replace;${target};307;`,
    })
  }),
}))
vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({
  draftMode: async () => ({
    isEnabled: false,
    enable: next.enable,
    disable: next.disable,
  }),
  cookies: async () => ({
    get: (name: string) => next.cookies.get(name),
    set: (value: { name: string }) => next.cookies.set(value.name, value),
    delete: (value: { name: string }) => next.cookies.delete(value.name),
  }),
}))
vi.mock("next/navigation", async (original) => ({
  ...(await original<typeof import("next/navigation")>()),
  redirect: next.redirect,
}))

import { createEnableDraftModeHandler, disableDraftMode } from "./draft-mode"

const SECRET = "preview-secret-sentinel-0123456789"
const TOKEN = "sk-viewer-token-sentinel-0123456789"
const closers: Array<() => Promise<void>> = []

/** Loopback Sanity API answering the helper's secret lookup. */
async function sanityApi(secretDocument: unknown) {
  const queries: string[] = []
  const server = createServer((request, response) => {
    let body = ""
    request.on("data", (chunk) => (body += chunk))
    request.on("end", () => {
      queries.push(
        decodeURIComponent(`${request.url}${body}`.replaceAll("+", " "))
      )
      response.writeHead(200, { "content-type": "application/json" })
      response.end(
        JSON.stringify({
          result: { private: secretDocument, public: null },
          ms: 1,
        })
      )
    })
  })
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done))
  closers.push(
    () =>
      new Promise((done) => {
        server.closeAllConnections()
        server.close(() => done())
      })
  )
  const apiHost = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return {
    queries,
    viewerClient: (token: string) =>
      createClient({
        projectId: "preview-project",
        dataset: "production",
        apiVersion: "2026-08-27",
        useCdn: false,
        apiHost,
        useProjectHostname: false,
        token,
      }),
  }
}

function handler(
  viewerClient: (token: string) => ReturnType<typeof createClient>,
  editorialPreview: () => unknown = () => ({ enabled: true, token: TOKEN }),
  onUnavailable?: () => void
) {
  return createEnableDraftModeHandler({
    editorialPreview: editorialPreview as never,
    viewerClient,
    onUnavailable,
  })
}

const request = (query: string) =>
  new Request(`http://localhost:3000/api/draft-mode/enable?${query}`)

beforeEach(() => {
  next.enable.mockClear()
  next.disable.mockClear()
  next.redirect.mockClear()
  next.cookies.clear()
})
afterEach(async () => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  await Promise.all(closers.splice(0).map((close) => close()))
})

describe("TST-LANDING-004 Draft Mode entry boundary", () => {
  it("answers 404 without contacting Sanity when preview is disabled or refused", async () => {
    const viewerClient = vi.fn()
    for (const editorialPreview of [
      () => ({ enabled: false }),
      () => {
        throw new Error("Preview deployments must not enable editorial preview")
      },
    ]) {
      const response = await handler(
        viewerClient,
        editorialPreview
      )(request(`sanity-preview-secret=${SECRET}`))
      expect(response.status).toBe(404)
    }
    expect(viewerClient).not.toHaveBeenCalled()
    expect(next.enable).not.toHaveBeenCalled()
  })

  it.each([
    ["a missing secret", "sanity-preview-pathname=%2F"],
    ["a blank secret", "sanity-preview-secret=%20"],
    [
      "a malformed redirect",
      `sanity-preview-secret=${SECRET}&sanity-preview-pathname=${encodeURIComponent("http://[bad")}`,
    ],
  ])(
    "quietly refuses %s before the helper can log the URL",
    async (_, query) => {
      vi.stubEnv("NODE_ENV", "development")
      const output = [
        vi.spyOn(console, "error").mockImplementation(() => {}),
        vi.spyOn(console, "warn").mockImplementation(() => {}),
        vi.spyOn(console, "log").mockImplementation(() => {}),
      ]
      const viewerClient = vi.fn()
      const response = await handler(viewerClient)(request(query))
      expect(response.status).toBe(401)
      expect(await response.text()).not.toContain(SECRET)
      expect(viewerClient).not.toHaveBeenCalled()
      for (const spy of output) expect(spy).not.toHaveBeenCalled()
    }
  )

  it("lets the native helper refuse an unknown or expired secret with the TTL-bound lookup", async () => {
    const api = await sanityApi(null)
    const response = await handler(api.viewerClient)(
      request(`sanity-preview-secret=${SECRET}&sanity-preview-pathname=%2F`)
    )
    expect(response.status).toBe(401)
    expect(next.enable).not.toHaveBeenCalled()
    expect(next.cookies.size).toBe(0)
    // Expiry is enforced by the helper's one-hour query filter.
    expect(api.queries.join("\n")).toContain("dateTime(now()) - 3600")
  })

  it("delegates a valid secret to the helper: Draft Mode on, relative redirect only", async () => {
    const api = await sanityApi({
      _id: "sanity-preview-url-secret.x",
      _updatedAt: new Date().toISOString(),
      secret: SECRET,
      studioUrl: "http://localhost:3000/studio",
    })
    await expect(
      handler(api.viewerClient)(
        request(
          `sanity-preview-secret=${SECRET}&sanity-preview-pathname=${encodeURIComponent("https://evil.example/landing?x=1")}`
        )
      )
    ).rejects.toMatchObject({ message: "NEXT_REDIRECT" })
    expect(next.enable).toHaveBeenCalledOnce()
    expect(next.redirect).toHaveBeenCalledWith("/landing?x=1")
    expect(next.cookies.has("__prerender_bypass")).toBe(true)
  })

  it("maps an unexpected Sanity failure to a quiet 503 without the secret", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {})
    const onUnavailable = vi.fn()
    const response = await handler(
      () => {
        throw new Error(`boom ${TOKEN} ${SECRET}`)
      },
      undefined,
      onUnavailable
    )(request(`sanity-preview-secret=${SECRET}`))
    expect(response.status).toBe(503)
    expect(onUnavailable).toHaveBeenCalledOnce()
    expect(onUnavailable.mock.calls[0]).toEqual([])
    expect(await response.text()).not.toMatch(new RegExp(`${SECRET}|${TOKEN}`))
    expect(JSON.stringify(errors.mock.calls)).not.toMatch(
      new RegExp(`${SECRET}|${TOKEN}`)
    )
  })

  it("keeps the quiet 503 when the unavailable diagnostic itself fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const response = await handler(
      () => {
        throw new Error("boom")
      },
      undefined,
      () => {
        throw new Error("logger down")
      }
    )(request(`sanity-preview-secret=${SECRET}`))
    expect(response.status).toBe(503)
  })
})

describe("TST-LANDING-004 Draft Mode exit", () => {
  it("turns Draft Mode off and returns to the published landing page", async () => {
    await expect(disableDraftMode()).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
    })
    expect(next.disable).toHaveBeenCalledOnce()
    expect(next.redirect).toHaveBeenCalledWith("/")
  })
})
