import "vitest"

declare module "vitest" {
  interface ProvidedContext {
    readonly testDatabaseUrl: string
  }
}
