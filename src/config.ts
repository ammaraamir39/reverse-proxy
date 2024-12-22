//Reading the configuations
import fs from "node:fs/promises"
import { parse } from "yaml"

/**Reading the file contents and then converting the yaml to the JSON and then returning it as string */
async function parseYAMLConfig(filePath: string) {
  const configFileContent = await fs.readFile(filePath, "utf8")
  const configurationParsed = parse(configFileContent)
  return JSON.stringify(configurationParsed)
}
