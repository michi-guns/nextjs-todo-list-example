export type CurrentUser = {
  id: string
  email: string
  name: string | null
}

type AuthUserRecord = {
  id: string
  email: string
  name?: string | null
}

export function toCurrentUser(user: AuthUserRecord): CurrentUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
  }
}
