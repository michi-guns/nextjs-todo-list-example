import { PREVIEW_SEED_USER } from "./constants"
import { PreviewDeliveryError } from "./core"

export async function smokePreview(input: {
  readonly url: string
  readonly email: string
  readonly password: string
}): Promise<{
  readonly landing: boolean
  readonly signedIn: boolean
  readonly mutated: boolean
}> {
  const origin = new URL(input.url).origin
  const landingResponse = await fetch(`${origin}/`, { redirect: "manual" })
  const landing = landingResponse.ok

  const signInResponse = await fetch(`${origin}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
    }),
    redirect: "manual",
  })
  const signedIn = signInResponse.ok
  const cookie =
    signInResponse.headers.getSetCookie?.().join("; ") ??
    signInResponse.headers.get("set-cookie")

  let mutated = false
  if (signedIn && cookie) {
    const createResponse = await fetch(`${origin}/api/lists`, {
      method: "POST",
      headers: {
        origin,
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({ name: "Preview smoke" }),
    })
    mutated = createResponse.ok
  }

  if (!landing || !signedIn || !mutated) {
    throw new PreviewDeliveryError(
      "command_failed",
      `Preview smoke failed landing=${landing} signedIn=${signedIn} mutated=${mutated}`
    )
  }

  if (input.email !== PREVIEW_SEED_USER.email) {
    throw new PreviewDeliveryError(
      "target_mismatch",
      "Preview smoke must use the controlled seed account"
    )
  }

  return { landing, signedIn, mutated }
}
