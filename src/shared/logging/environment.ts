import { logEnvironmentSchema, type LogEnvironment } from "./config"

/** Output selection only; runtime target validation belongs to T-26.8. */
export function loggingEnvironment(
  environment: { APP_ENV?: string; NODE_ENV?: string } = process.env
): LogEnvironment {
  const parsed = logEnvironmentSchema.safeParse(environment.APP_ENV)
  return parsed.success
    ? parsed.data
    : environment.NODE_ENV === "production"
      ? "production"
      : "local"
}
