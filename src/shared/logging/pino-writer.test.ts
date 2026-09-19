import { spawnSync } from "node:child_process"
import { describe, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
import { createLogger } from "./logger"
import { createPinoWriter } from "./pino-writer"
import { logLevels } from "./config"

describe("TST-LOGGING-001 real Pino output", () => {
  it("writes deployed JSON with trusted severity/time on the matching console channel", () => {
    const sink = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const write = createPinoWriter("production", sink)
    for (const level of logLevels)
      write(level, {
        environment: "production",
        event: "job.done",
        module: "jobs",
        correlationId: "generated-id",
      })
    expect(sink.log).toHaveBeenCalledTimes(3)
    expect(sink.warn).toHaveBeenCalledTimes(1)
    expect(sink.error).toHaveBeenCalledTimes(2)
    const record = JSON.parse(sink.warn.mock.calls[0][0])
    expect(record).toMatchObject({
      level: 40,
      severity: "warn",
      event: "job.done",
      module: "jobs",
      environment: "production",
      correlationId: "generated-id",
    })
    expect(Number.isNaN(Date.parse(record.time))).toBe(false)
    expect(record).not.toHaveProperty("pid")
    expect(record).not.toHaveProperty("hostname")
  })

  it("writes readable local output with the same safe fields and contains destination exceptions", () => {
    const sink = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const write = createPinoWriter("local", sink)
    write("info", {
      event: "job.done",
      module: "jobs",
      environment: "local",
      correlationId: "generated-id",
      durationMs: 5,
    })
    expect(sink.log.mock.calls[0][0]).toContain("INFO jobs job.done")
    expect(sink.log.mock.calls[0][0]).toContain('"environment":"local"')
    expect(sink.log.mock.calls[0][0]).toContain(
      '"correlationId":"generated-id"'
    )
    const broken = createPinoWriter("local", {
      log() {
        throw new Error("broken")
      },
      warn() {
        throw new Error("broken")
      },
      error() {
        throw new Error("broken")
      },
    })
    expect(() =>
      broken("error", {
        event: "job.failed",
        module: "jobs",
        environment: "local",
      })
    ).not.toThrow()
  })

  it.each(["local", "production"] as const)(
    "never exposes sensitive fixture strings in %s output",
    (environment) => {
      const sink = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
      const log = createLogger({
        environment,
        write: createPinoWriter(environment, sink),
      })("auth")
      const secret =
        "SENTINEL-person@example.com-token-postgres://user:password@host-private-task"
      const error = Object.assign(
        new Error(secret, { cause: { message: secret } }),
        { stack: secret }
      )
      log.emit("error", "mail.failed", {
        error,
        message: secret,
        token: secret,
        email: secret,
        nested: { password: secret },
      })
      const output = sink.error.mock.calls[0][0]
      expect(output).not.toContain("SENTINEL")
      expect(output).toContain('"error":{"kind":"unexpected"}')
    }
  )

  it("contains serialization errors at the internal writer boundary", () => {
    const sink = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const write = createPinoWriter("production", sink)
    const record = {
      event: "job.done",
      module: "jobs",
      environment: "production" as const,
    }
    Object.defineProperty(record, "durationMs", {
      enumerable: true,
      get() {
        throw new Error("SENTINEL-serialization")
      },
    })
    expect(() => write("info", record)).not.toThrow()
    expect(sink.log).not.toHaveBeenCalled()
  })

  it.each(["local", "production"] as const)(
    "survives an asynchronous %s console stream failure in a real process",
    (environment) => {
      const source = `
      import { Console } from 'node:console';
      import { Writable } from 'node:stream';
      import { createLogger } from './src/shared/logging/logger.ts';
      import { createPinoWriter } from './src/shared/logging/pino-writer.ts';
      const failing = new Writable({ write(chunk, encoding, done) { done(new Error('SENTINEL-output')); } });
      const sink = new Console({ stdout: failing, stderr: failing });
      const log = createLogger({ environment: '${environment}', write: createPinoWriter('${environment}', sink) })('smoke');
      log.emit('info', 'smoke.done');
      log.emit('error', 'smoke.failed');
      await new Promise(resolve => setImmediate(resolve));
      process.stdout.write('business-ok');
    `
      const result = spawnSync(
        process.execPath,
        [
          "--conditions=react-server",
          "--import",
          "tsx",
          "--input-type=module",
          "-e",
          source,
        ],
        { encoding: "utf8", timeout: 15_000 }
      )
      expect(result.error).toBeUndefined()
      expect(result.status, result.stderr).toBe(0)
      expect(result.stdout).toBe("business-ok")
      expect(result.stderr).toBe("")
    }
  )

  it.each(["local", "production"])(
    "finishes a short %s Node process with stdout/stderr intact",
    (environment) => {
      const source = `
      import { createLogger } from './src/shared/logging/logger.ts';
      import { withLogContext } from './src/shared/logging/context.ts';
      const log = createLogger({ environment: '${environment}' })('smoke');
      await withLogContext('smoke.run', async () => {
        await Promise.resolve();
        log.emit('info', 'smoke.done');
        log.emit('warn', 'smoke.warning');
        log.emit('error', 'smoke.failed', { error: new Error('SENTINEL-secret') });
      });
    `
      const result = spawnSync(
        process.execPath,
        [
          "--conditions=react-server",
          "--import",
          "tsx",
          "--input-type=module",
          "-e",
          source,
        ],
        { encoding: "utf8", timeout: 15_000 }
      )
      expect(result.error).toBeUndefined()
      expect(result.status, result.stderr).toBe(0)
      expect(result.stdout.trim().split("\n")).toHaveLength(1)
      expect(result.stderr.trim().split("\n")).toHaveLength(2)
      expect(result.stdout).toContain("smoke.done")
      expect(result.stderr).toContain("smoke.warning")
      expect(result.stderr).toContain("smoke.failed")
      expect(result.stderr).not.toContain("SENTINEL")
      if (environment === "production")
        expect(JSON.parse(result.stdout).correlationId).toMatch(
          /^[0-9a-f-]{36}$/
        )
    }
  )
})
