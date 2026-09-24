export const DEFAULT_AUTH_REDIRECT = "/dashboard"

const redirectOrigin = "https://auth.local"
const controlCharacterPattern = /[\u0000-\u001f\u007f]/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/**
 * Keep browser navigation inside this application. Better Auth also checks
 * trusted origins, but the UI must not hand it an attacker-controlled target.
 */
export function getSafeAuthRedirect(candidate: unknown): string {
  if (typeof candidate !== "string") {
    return DEFAULT_AUTH_REDIRECT
  }

  const value = candidate.trim()
  if (
    value.length === 0 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    controlCharacterPattern.test(value)
  ) {
    return DEFAULT_AUTH_REDIRECT
  }

  try {
    const decoded = decodeURIComponent(value)
    if (
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      controlCharacterPattern.test(decoded)
    ) {
      return DEFAULT_AUTH_REDIRECT
    }

    const parsed = new URL(value, redirectOrigin)
    if (parsed.origin !== redirectOrigin) {
      return DEFAULT_AUTH_REDIRECT
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return DEFAULT_AUTH_REDIRECT
  }
}

export function buildAuthHref(pathname: string, next: unknown): string {
  const safeNext = getSafeAuthRedirect(next)
  return `${pathname}?next=${encodeURIComponent(safeNext)}`
}

/**
 * Every verification link returns through `/verify-email`, which requires a
 * real session before continuing to the safe `next` path and offers a fresh
 * link when Better Auth reports an invalid or expired token.
 */
export function buildVerificationCallback(next: unknown): string {
  return buildAuthHref("/verify-email", next)
}

/** Password-reset links return to this page with `?token=` or `?error=`. */
export const RESET_PASSWORD_CALLBACK = "/reset-password"

export type RecoveryLinkError = "TOKEN_EXPIRED" | "INVALID_TOKEN"

/** Collapse any callback `error` value into the small public vocabulary. */
export function getRecoveryLinkError(value: unknown): RecoveryLinkError | null {
  const candidate = Array.isArray(value) ? value[0] : value
  if (typeof candidate !== "string" || candidate.length === 0) return null
  return candidate === "TOKEN_EXPIRED" ? "TOKEN_EXPIRED" : "INVALID_TOKEN"
}

const authErrorMessages: Record<string, string> = {
  EMAIL_NOT_VERIFIED:
    "Check your email to verify your account before signing in.",
  INVALID_EMAIL: "Enter a valid email address.",
  INVALID_EMAIL_OR_PASSWORD: "The email or password is incorrect.",
  INVALID_PASSWORD: "Enter a valid password.",
  PASSWORD_TOO_SHORT: "Use a password with at least 8 characters.",
  PASSWORD_TOO_LONG: "Use a password with no more than 128 characters.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "That sign-up could not be completed. Try another email.",
  INVALID_TOKEN:
    "That link is invalid or has expired. Request a new link and try again.",
  TOKEN_EXPIRED: "That link has expired. Request a new link and try again.",
  RECIPIENT_COOLDOWN:
    "An email was sent recently. Wait a minute before requesting another.",
  EMAIL_TEMPORARILY_UNAVAILABLE:
    "Email is temporarily unavailable. Please try again later.",
  NEW_USER_SIGNUP_DISABLED:
    "That link cannot create a new account. Request a new link or sign in another way.",
}

const genericAuthErrorMessage = "Something went wrong. Please try again."

/** Map provider-shaped failures to a deliberately small public vocabulary. */
export function getAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === "string"
      ? error
      : isRecord(error) && typeof error.code === "string"
        ? error.code
        : null
  const status =
    isRecord(error) && typeof error.status === "number" ? error.status : null

  if (code && code in authErrorMessages) return authErrorMessages[code]
  if (status === 429) {
    return "Too many attempts. Wait a moment and try again."
  }

  return code
    ? (authErrorMessages[code] ?? genericAuthErrorMessage)
    : genericAuthErrorMessage
}
