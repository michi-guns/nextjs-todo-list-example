import { createServer, type IncomingHttpHeaders } from "node:http"
import type { AddressInfo } from "node:net"

export type CollectedRequest = {
  method: string
  path: string
  headers: IncomingHttpHeaders
  body: string
}

/**
 * Local wire collector for adapter tests. It records raw requests and lets a
 * test choose each response, including slow or hanging ones.
 */
export async function startCollector(
  respond: (
    request: CollectedRequest
  ) => { status: number; delayMs?: number } | "hang" = () => ({ status: 200 })
) {
  const requests: CollectedRequest[] = []
  let aborted = 0
  const server = createServer((request, response) => {
    const chunks: Buffer[] = []
    request.on("data", (chunk: Buffer) => chunks.push(chunk))
    request.on("end", () => {
      const collected = {
        method: request.method ?? "",
        path: request.url ?? "",
        headers: request.headers,
        body: Buffer.concat(chunks).toString("utf8"),
      }
      requests.push(collected)
      const outcome = respond(collected)
      if (outcome === "hang") {
        response.on("close", () => aborted++)
        return
      }
      setTimeout(() => {
        response.writeHead(outcome.status, {
          "content-type": "application/json",
        })
        response.end("{}")
      }, outcome.delayMs ?? 0)
    })
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const { port } = server.address() as AddressInfo
  return {
    origin: `http://127.0.0.1:${port}`,
    port,
    requests,
    aborted: () => aborted,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}

/** Parses a Sentry envelope body: header line, then item header/payload pairs. */
export function parseEnvelopeBody(body: string) {
  const [header, ...rest] = body.split("\n").filter(Boolean)
  const items: Array<{ type: string; payload: Record<string, unknown> }> = []
  for (let i = 0; i < rest.length; i += 2)
    items.push({
      type: JSON.parse(rest[i]).type,
      payload: JSON.parse(rest[i + 1]),
    })
  return { header: JSON.parse(header) as Record<string, unknown>, items }
}
