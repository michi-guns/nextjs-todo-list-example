import { readResendConfig } from "../../src/modules/auth/infrastructure/resend-mail"

try {
  readResendConfig(process.env)
  process.stdout.write(
    JSON.stringify({
      result: "configuration_valid",
      provider: "resend",
      secretNamespace: "production",
      remoteDeliveryTested: false,
    }) + "\n"
  )
} catch {
  process.stderr.write("Invalid Production Resend configuration\n")
  process.exitCode = 1
}
