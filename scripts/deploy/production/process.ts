import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execute = promisify(execFile)

/** Capture output without a shell; callers emit only allowlisted evidence. */
export async function runReleaseProcess(
  command: string,
  args: string[],
  environment?: Record<string, string>
): Promise<string> {
  try {
    const { stdout } = await execute(command, args, {
      env: { ...process.env, ...environment },
      windowsHide: true,
      timeout: 15 * 60 * 1000,
      maxBuffer: 8 * 1024 * 1024,
    })
    return stdout
  } catch {
    // Provider stderr and command arguments can contain credentials.
    throw new Error("Release subprocess failed")
  }
}
