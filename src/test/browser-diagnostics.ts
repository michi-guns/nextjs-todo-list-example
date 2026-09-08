/** Keep auth link credentials out of browser failure messages and reports. */
export function redactAuthTokens(message: string): string {
  return message.replace(/([?&]token=)[^&\s"'<>]+/gi, "$1[redacted]")
}
