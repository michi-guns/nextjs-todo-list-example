import { describe, expect, it } from "vitest"
import { runReleaseProcess } from "./process"

describe("Release subprocess boundary", () => {
  it("passes arguments literally without a shell", async () => {
    const literal = "value & injected; $()"
    expect(
      await runReleaseProcess(process.execPath, [
        "-e",
        "process.stdout.write(process.argv[1])",
        literal,
      ])
    ).toBe(literal)
  })

  it("does not expose secret-bearing arguments or stderr on failure", async () => {
    await expect(
      runReleaseProcess(process.execPath, [
        "-e",
        "process.stderr.write('sensitive-token'); process.exit(2)",
      ])
    ).rejects.toThrow(/^Release subprocess failed$/)
  })
})
