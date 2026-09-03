import {
  NEON_DEVELOPMENT_BRANCH,
  NEON_DEVELOPMENT_PORT,
  NEON_DEVELOPMENT_PROJECT_ID,
} from "../../neon-development/constants"

export const PREVIEW_PROJECT_ID = NEON_DEVELOPMENT_PROJECT_ID
export const PREVIEW_PARENT_BRANCH = NEON_DEVELOPMENT_BRANCH
export const PREVIEW_BRANCH_PREFIX = "preview-"
export const PREVIEW_PORT = NEON_DEVELOPMENT_PORT
export const PREVIEW_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

export const PREVIEW_SEED_USER = {
  email: "preview-user@example.test",
  password: "Preview-user-password-123!",
  name: "Preview user",
  listName: "Inbox",
} as const

export function previewBranchName(previewId: string): string {
  return `${PREVIEW_BRANCH_PREFIX}${previewId}`
}
