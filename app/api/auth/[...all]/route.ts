import { toNextJsHandler } from "better-auth/next-js"

import { auth } from "@/lib/auth"
import { loggedHandler } from "@/src/shared/logging/server"

const handler = toNextJsHandler(auth)

export const GET = loggedHandler("auth", "auth.get", handler.GET)
export const POST = loggedHandler("auth", "auth.post", handler.POST)
export const PATCH = loggedHandler("auth", "auth.patch", handler.PATCH)
export const PUT = loggedHandler("auth", "auth.put", handler.PUT)
export const DELETE = loggedHandler("auth", "auth.delete", handler.DELETE)
