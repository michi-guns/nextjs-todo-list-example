import { auth } from "@/lib/auth"

import { toCurrentUser, type CurrentUser } from "../domain/current-user"

export async function getCurrentUserFromHeaders(
  requestHeaders: Headers
): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({
    headers: requestHeaders,
    query: {
      disableCookieCache: true,
    },
  })

  if (!session) {
    return null
  }

  return toCurrentUser(session.user)
}
