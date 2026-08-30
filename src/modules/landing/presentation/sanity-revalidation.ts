import { timingSafeEqual } from "node:crypto"
import type { NextRequest } from "next/server"
import { parseBody } from "next-sanity/webhook"
import { z } from "zod"

const LANDING_DOCUMENT_ID = "landingPage"
const LANDING_DOCUMENT_TYPE = "landingPage"

const sanityWebhookEnvelopeSchema = z.object({
  _id: z.string().min(1),
  _type: z.string().min(1),
})

type ParsedWebhookBody = {
  isValidSignature: boolean | null
  body: unknown | null
}

export type ParseSanityWebhookBody = (
  request: NextRequest,
  secret: string,
  waitForContentLakeEventualConsistency: boolean
) => Promise<ParsedWebhookBody>

export interface SanityWebhookDependencies {
  webhookSecret?: string
  invalidate: () => void | Promise<void>
  parseBody?: ParseSanityWebhookBody
  waitForContentLakeEventualConsistency?: boolean
}

export interface ManualLandingRecoveryDependencies {
  manualRecoverySecret?: string
  invalidate: () => void | Promise<void>
}

function configuredSecret(value: string | undefined): string | undefined {
  const secret = value?.trim()
  return secret || undefined
}

function errorResponse(
  status: number,
  code:
    | "configuration_error"
    | "invalid_payload"
    | "invalid_signature"
    | "server_error"
    | "unauthorized"
): Response {
  return Response.json(
    {
      error: {
        code,
      },
    },
    { status }
  )
}

export async function handleSanityWebhook(
  request: NextRequest,
  dependencies: SanityWebhookDependencies
): Promise<Response> {
  const secret = configuredSecret(dependencies.webhookSecret)

  if (!secret) {
    return errorResponse(500, "configuration_error")
  }

  const parse = dependencies.parseBody ?? (parseBody as ParseSanityWebhookBody)
  let parsed: ParsedWebhookBody

  try {
    parsed = await parse(
      request,
      secret,
      dependencies.waitForContentLakeEventualConsistency ?? true
    )
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse(400, "invalid_payload")
    }

    return errorResponse(500, "server_error")
  }

  if (parsed.isValidSignature !== true) {
    return errorResponse(401, "invalid_signature")
  }

  const payload = sanityWebhookEnvelopeSchema.safeParse(parsed.body)

  if (!payload.success) {
    return errorResponse(400, "invalid_payload")
  }

  if (
    payload.data._id !== LANDING_DOCUMENT_ID ||
    payload.data._type !== LANDING_DOCUMENT_TYPE
  ) {
    return new Response(null, { status: 204 })
  }

  try {
    await dependencies.invalidate()
  } catch {
    return errorResponse(500, "server_error")
  }

  return Response.json({ revalidated: true })
}

function hasAuthorizedBearerToken(request: Request, secret: string): boolean {
  const authorization = request.headers.get("authorization")

  if (!authorization?.startsWith("Bearer ")) {
    return false
  }

  const providedToken = Buffer.from(authorization.slice("Bearer ".length))
  const expectedToken = Buffer.from(secret)

  return (
    providedToken.length === expectedToken.length &&
    timingSafeEqual(providedToken, expectedToken)
  )
}

export async function handleManualLandingRecovery(
  request: Request,
  dependencies: ManualLandingRecoveryDependencies
): Promise<Response> {
  const secret = configuredSecret(dependencies.manualRecoverySecret)

  if (!secret) {
    return errorResponse(500, "configuration_error")
  }

  if (!hasAuthorizedBearerToken(request, secret)) {
    return errorResponse(401, "unauthorized")
  }

  try {
    await dependencies.invalidate()
  } catch {
    return errorResponse(500, "server_error")
  }

  return Response.json({ revalidated: true })
}
