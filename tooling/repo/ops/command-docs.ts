import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { root } from './runtime'

export function commandDocs(help: string, write = false, directory = root): void {
  const file = resolve(directory, 'docs/reference/repo-cli.md')
  const text = readFileSync(file, 'utf8')
  const start = '<!-- repo-commands:start -->'
  const end = '<!-- repo-commands:end -->'
  const from = text.indexOf(start)
  const to = text.indexOf(end)
  if (from < 0 || to < from)
    throw new Error('Command documentation markers are missing')
  const expected = `${text.slice(0, from + start.length)}\n\n\`\`\`text\n${help.trimEnd()}\n\`\`\`\n\n${text.slice(to)}`
  if (write)
    writeFileSync(file, expected)
  else if (expected !== text)
    throw new Error('Command documentation drift; run generate commands')
}
