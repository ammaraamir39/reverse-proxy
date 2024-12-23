import { program } from "commander"
import { parseYAMLConfig, validateConfig } from "./config"
import os from "node:os"
import { CreateServer } from "./server"

async function main() {
  program.option("--config <path>")
  program.parse()

  const options = program.opts()
  if (options && "config" in options) {
    const validatedConfig = await validateConfig(
      await parseYAMLConfig(options.config)
    )
    await CreateServer({
      port: validatedConfig.server.listen,
      workerCounts: validatedConfig.server.workers ?? os.cpus().length,
      config: validatedConfig
    })
  }
}
main()
