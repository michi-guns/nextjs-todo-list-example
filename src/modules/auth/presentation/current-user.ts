import { headers } from "next/headers"

import { getCurrentUserFromHeaders } from "../infrastructure/current-user"
import type { CurrentUser } from "../domain/current-user"

export class UnauthenticatedError extends Error {
  readonly code = "unauthenticated"

  constructor() {
    super("Authentication is required")
    this.name = "UnauthenticatedError"
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  return getCurrentUserFromHeaders(await headers())
}

export async function requireUser(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    throw new UnauthenticatedError()
  }

  return currentUser
}

export async function getCurrentUserForHeaders(
  requestHeaders: Headers
): Promise<CurrentUser | null> {
  return getCurrentUserFromHeaders(requestHeaders)
}

export async function requireUserForHeaders(
  requestHeaders: Headers
): Promise<CurrentUser> {
  const currentUser = await getCurrentUserForHeaders(requestHeaders)

  if (!currentUser) {
    throw new UnauthenticatedError()
  }

  return currentUser
}
