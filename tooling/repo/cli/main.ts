#!/usr/bin/env bun

import process from 'node:process'
import { dispatchCompoundCommand } from './dispatch'
import { repoCliUsage } from './lib/help'
import { runBunScript } from './lib/spawn'
import { isCompoundRepoCommand, parseRepoCliArgs } from './parse-repo-cli'
import { resolveRepoCommandScript } from './registry'

let parsed
try {
  parsed = parseRepoCliArgs(process.argv)
}
catch (error) {
  console.error(error instanceof Error ? error.message : error)
  console.error('')
  console.error(repoCliUsage())
  process.exit(1)
}

if (parsed.kind === 'help') {
  console.log(repoCliUsage())
  process.exit(0)
}

if (isCompoundRepoCommand(parsed.command)) {
  process.exit(await dispatchCompoundCommand(parsed.command, parsed.forwardArgs))
}

const scriptPath = resolveRepoCommandScript(parsed.command)
const exitCode = await runBunScript(scriptPath, parsed.forwardArgs)
process.exit(exitCode)
