import {
  EnvironmentProfileError,
  optional,
  parseBoolean,
  type AppEnv,
  type EnvironmentVariables,
} from "../shared/environment/rules"

/** Public, non-secret capability flag; false unless set exactly to `true`. */
export const EDITORIAL_PREVIEW_FLAG =
  "NEXT_PUBLIC_SANITY_EDITORIAL_PREVIEW_ENABLED"
/** Private read-only Sanity Viewer token; server-only, never `NEXT_PUBLIC_`. */
export const EDITORIAL_PREVIEW_TOKEN = "SANITY_API_READ_TOKEN"

const EDITORIAL_PROFILES: readonly AppEnv[] = [
  "local",
  "development",
  "production",
]

export type EditorialPreview =
  | { readonly enabled: false }
  | { readonly enabled: true; readonly token: string }

/**
 * Editorial Draft Mode is allowed only for Local, Development and Production
 * sessions on the `production` dataset, with a Viewer token. Deployment
 * Preview never receives the token or the capability. Disabled preview needs
 * no token, so ordinary builds and published reads are unaffected. Errors
 * name the variable, never its value.
 */
export function parseEditorialPreview(
  profile: AppEnv | "unprofiled",
  environment: EnvironmentVariables
): EditorialPreview {
  const enabled = parseBoolean(environment, EDITORIAL_PREVIEW_FLAG)
  const token = optional(environment, EDITORIAL_PREVIEW_TOKEN)

  if (
    enabled &&
    (profile === "unprofiled" || !EDITORIAL_PROFILES.includes(profile))
  )
    throw new EnvironmentProfileError(
      "sanity_policy_mismatch",
      "Editorial preview is allowed only for local, development or production",
      EDITORIAL_PREVIEW_FLAG
    )
  if (profile === "preview" && token)
    throw new EnvironmentProfileError(
      "sanity_policy_mismatch",
      "Preview deployments must not receive the Sanity Viewer token",
      EDITORIAL_PREVIEW_TOKEN
    )
  if (!enabled) return { enabled: false }

  if (optional(environment, "NEXT_PUBLIC_SANITY_DATASET") !== "production")
    throw new EnvironmentProfileError(
      "sanity_policy_mismatch",
      "Editorial preview requires the production Sanity dataset",
      "NEXT_PUBLIC_SANITY_DATASET"
    )
  if (!token)
    throw new EnvironmentProfileError(
      "missing_variable",
      "Editorial preview requires the Sanity Viewer token",
      EDITORIAL_PREVIEW_TOKEN
    )
  return { enabled: true, token }
}
