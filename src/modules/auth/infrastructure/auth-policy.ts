/**
 * Auth admission and recovery defaults chosen by the account plan
 * (docs/agentforge/plans/2026-09-19-t-27-account-recovery.md) within D-011 and
 * TD-032. Windows are seconds. Native Better Auth IP rules for sign-up,
 * sign-in, email requests and magic links are kept, not restated here.
 */
export const AUTH_ADMISSION_POLICY = {
  /** Explicit email requests (reset, verification resend, magic link). */
  recipientRequest: { window: 60, max: 1 },
  /** Every actual auth email of any kind, including automatic sends. */
  recipientSend: { window: 900, max: 5 },
  /** Password-reset submissions per client address. */
  resetSubmissionIp: { window: 60, max: 5 },
  resetPasswordTokenSeconds: 1800,
} as const
