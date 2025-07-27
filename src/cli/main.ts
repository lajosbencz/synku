import path from 'path'
import { pathToFileURL } from 'url'
import { Release } from '../core'
import { YamlWriter } from '../writer/yaml'

async function executeUserFile(filePath: string): Promise<Release> {
  const absPath = path.resolve(process.cwd(), filePath)

  const userModule = await import(pathToFileURL(absPath).href)
  const exportedFunction = userModule.default

  if (typeof exportedFunction !== 'function') {
    throw new Error('User file must export a default function that returns a Release instance')
  }

  const result = await exportedFunction()

  if (!result || typeof result.synth !== 'function' || typeof result.validate !== 'function') {
    throw new Error('Exported function must return a Release instance')
  }

  return result
}

async function main() {
  const file = process.argv[2]
  if (!file) {
    throw new Error('Usage: synku <file.ts>')
  }

  const release = await executeUserFile(file)
  const writer = new YamlWriter()
  writer.write(release, process.stdout)
}

main().catch((error) => {
  console.error('Error:', error instanceof Error ? error.message : String(error))
  process.exit(2)
})
