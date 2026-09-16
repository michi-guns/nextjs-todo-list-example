/** Keep auth link credentials out of browser failure messages and reports. */
export function redactAuthTokens(message: string): string {
  return message.replace(/([?&]token=)[^&\s"'<>]+/gi, "$1[redacted]")
}

/** Firefox reports interrupted Next.js chunk loads with its own cancellation code. */
export function isBrowserRequestCancellation(
  failure: string | undefined,
  request: { method: string; resourceType: string; url: string }
): boolean {
  if (failure === "net::ERR_ABORTED") return true
  return (
    failure === "NS_BINDING_ABORTED" &&
    request.method === "GET" &&
    request.resourceType === "script" &&
    new URL(request.url).pathname.startsWith("/_next/static/")
  )
}
