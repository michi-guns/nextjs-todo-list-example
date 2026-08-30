import {
  mkdir,
  readFile,
  readdir,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { createHash } from "node:crypto"

export type MagicLinkMessage = {
  email: string
  url: string
  token: string
  metadata?: Record<string, unknown>
}

type StoredMagicLinkMessage = MagicLinkMessage & {
  capturedAt: string
}

const mailboxEnabledValue = "true"

function isLocalOrTestRuntime() {
  return (
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
  )
}

export function isLocalMailboxEnabled() {
  return (
    isLocalOrTestRuntime() &&
    process.env.BETTER_AUTH_LOCAL_MAILBOX === mailboxEnabledValue
  )
}

function getMailboxDirectory() {
  const mailboxDirectory = path.resolve(
    /* turbopackIgnore: true */
    process.env.BETTER_AUTH_MAILBOX_DIR?.trim() ||
      path.join(os.tmpdir(), "nextjs-todo-list-example", "better-auth-mailbox")
  )

  const temporaryRoot = path.resolve(os.tmpdir())
  const projectMailboxRoot = path.resolve(
    process.cwd(),
    ".local",
    "better-auth-mailbox"
  )
  const isDescendant = (root: string) => {
    const relativePath = path.relative(root, mailboxDirectory)
    return (
      relativePath.length > 0 &&
      relativePath !== ".." &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath)
    )
  }

  if (mailboxDirectory !== projectMailboxRoot && !isDescendant(temporaryRoot)) {
    throw new Error(
      "BETTER_AUTH_MAILBOX_DIR must be a child of the operating-system temporary directory or .local/better-auth-mailbox"
    )
  }

  return mailboxDirectory
}

function getMailboxFile(email: string) {
  const digest = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
  return path.join(getMailboxDirectory(), `${digest}.json`)
}

function assertMailboxEnabled() {
  if (!isLocalMailboxEnabled()) {
    throw new Error(
      "The Better Auth local mailbox is available only when NODE_ENV is development/test and BETTER_AUTH_LOCAL_MAILBOX=true"
    )
  }
}

export async function captureMagicLink(message: MagicLinkMessage) {
  assertMailboxEnabled()

  const directory = getMailboxDirectory()
  await mkdir(directory, { recursive: true, mode: 0o700 })

  const storedMessage: StoredMagicLinkMessage = {
    ...message,
    capturedAt: new Date().toISOString(),
  }

  await writeFile(
    getMailboxFile(message.email),
    JSON.stringify(storedMessage),
    {
      encoding: "utf8",
      mode: 0o600,
    }
  )
}

export async function readLatestMagicLink(
  email: string
): Promise<StoredMagicLinkMessage | null> {
  assertMailboxEnabled()

  try {
    const contents = await readFile(getMailboxFile(email), "utf8")
    return JSON.parse(contents) as StoredMagicLinkMessage
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null
    }

    throw error
  }
}

export async function clearMagicLinkMailbox() {
  assertMailboxEnabled()
  const directory = getMailboxDirectory()

  let entries
  try {
    entries = await readdir(/* turbopackIgnore: true */ directory, {
      withFileTypes: true,
    })
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return
    }

    throw error
  }

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => unlink(path.join(directory, entry.name)))
  )

  try {
    await rmdir(directory)
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      ["ENOENT", "ENOTEMPTY"].includes(String(error.code))
    ) {
      return
    }

    throw error
  }
}

export async function listMagicLinkMailbox() {
  assertMailboxEnabled()

  try {
    const entries = await readdir(
      /* turbopackIgnore: true */ getMailboxDirectory(),
      {
        withFileTypes: true,
      }
    )
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort()
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return []
    }

    throw error
  }
}
