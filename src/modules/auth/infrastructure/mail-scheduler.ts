// The explicit file keeps plain Node ESM (seeds, Playwright setup) resolving it.
import { after } from "next/server.js"

/** Runs auth-mail work outside the auth response. */
export interface AuthMailScheduler {
  schedule(task: () => Promise<void>): void
}

/**
 * Next's supported post-response lifetime for route handlers and server
 * functions. Calling it outside a request scope throws, so standalone callers
 * must select an explicit scheduler first.
 */
export const nextAfterScheduler: AuthMailScheduler = {
  schedule: (task) => after(task),
}

/** Starts work immediately and lets the owner wait for all of it. */
export function createDrainableScheduler() {
  const pending = new Set<Promise<void>>()
  return {
    schedule(task: () => Promise<void>) {
      const running = task()
      pending.add(running)
      running.then(
        () => pending.delete(running),
        () => pending.delete(running)
      )
    },
    /** Waits for scheduled work, including work scheduled meanwhile. */
    async drain(): Promise<void> {
      let failure: { reason: unknown } | undefined
      while (pending.size > 0) {
        for (const result of await Promise.allSettled([...pending]))
          if (result.status === "rejected") failure ??= result
      }
      if (failure) throw failure.reason
    },
  } satisfies AuthMailScheduler & { drain(): Promise<void> }
}

const SELECTED = Symbol.for("nextjs-todo.auth.mail-scheduler")
type Selection = { [SELECTED]?: AuthMailScheduler }

/** Process-wide, so every compiled module copy sees the same selection. */
export function selectAuthMailScheduler(
  scheduler: AuthMailScheduler | undefined
): void {
  ;(globalThis as Selection)[SELECTED] = scheduler
}

export function currentAuthMailScheduler(): AuthMailScheduler {
  return (globalThis as Selection)[SELECTED] ?? nextAfterScheduler
}

/** A mailbox reader that first waits for scheduled sends. */
export function drainingMailbox<
  Mailbox extends {
    clearMagicLinkMailbox(): Promise<void>
    readLatestMagicLink(email: string): Promise<unknown>
  },
>(mailbox: Mailbox, scheduler: { drain(): Promise<void> }): Mailbox {
  return {
    ...mailbox,
    async clearMagicLinkMailbox() {
      await scheduler.drain()
      await mailbox.clearMagicLinkMailbox()
    },
    async readLatestMagicLink(email: string) {
      await scheduler.drain()
      return mailbox.readLatestMagicLink(email)
    },
  }
}

/**
 * Seeds, scripts and integration tests have no request scope: they send
 * in-process and must `drain()` before reading a mailbox or exiting.
 */
export function selectStandaloneAuthMail() {
  const scheduler = createDrainableScheduler()
  selectAuthMailScheduler(scheduler)
  return scheduler
}
