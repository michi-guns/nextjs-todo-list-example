import { inject } from "vitest"

process.env.TEST_DATABASE_URL = inject("testDatabaseUrl")
