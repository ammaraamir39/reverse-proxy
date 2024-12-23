//Reading the configuations
import fs from "node:fs/promises"
import { parse } from "yaml"
import { rootConfigSchema } from "./config-schema"

/**Reading the file contents and then converting the yaml to the JSON
     and then returning it as string */
export async function parseYAMLConfig(filePath: string) {
  const configFileContent = await fs.readFile(filePath, "utf8")
  const configurationParsed = parse(configFileContent)
  return JSON.stringify(configurationParsed)
}

export async function validateConfig(config: string) {
  const validatedConfig = await rootConfigSchema.parse(JSON.parse(config))
  return validatedConfig
}
