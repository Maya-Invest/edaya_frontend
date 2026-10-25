import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { expect, test } from 'bun:test'
import { commandDocs } from '../command-docs'
import { commandEntries, commandHelp, resolveCommand } from '../command-tree'
import { commands, removedCommands } from '../commands'
import { main, reference } from '../main'
import { root } from '../runtime'

const parse = (args: string[]) => resolveCommand(commands, args, removedCommands)

test('every command has isolated help through the real executable', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'edaya-cli-help-'))
  try {
    const guard = resolve(directory, 'guard.cjs')
    writeFileSync(guard, `const fs = require('node:fs');
const deny = () => { throw new Error('Help attempted a side effect'); };
for (const name of ['writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync', 'unlinkSync', 'renameSync', 'copyFileSync']) fs[name] = deny;
const read = fs.readFileSync;
fs.readFileSync = function(path, ...args) { if (/\\.env|config[^/]*\\.jsonc|secrets[^/]*\\.json|\\.generated/.test(String(path))) deny(); return read.call(this, path, ...args); };
for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) require('node:child_process')[name] = deny;
Bun.spawn = deny; Bun.spawnSync = deny; globalThis.fetch = deny;
`)
    for (const { command, path } of commandEntries(commands)) {
      const child = Bun.spawnSync([process.execPath, '--no-env-file', '--preload', guard, resolve(root, 'tooling/repo/ops/main.ts'), ...path, '--help'], {
        cwd: directory,
        env: { PATH: '', AUTH_DATABASE_URL: 'invalid', DATABASE_URL: 'invalid', EDAYA_LOCAL_ENV_FILE: '/missing', CI: 'true' },
        timeout: 5000,
      })
      expect(child.stderr.toString()).toBe('')
      expect(child.exitCode).toBe(0)
      expect(child.stdout.toString().trim()).toBe(commandHelp(command, path).trim())
    }
  }
  finally { rmSync(directory, { recursive: true, force: true }) }
}, 30000)

test('groups show help and invalid paths cannot be hidden by --help', () => {
  expect(parse([]).help).toBe(true)
  for (const group of ['test', 'generate', 'ops', 'ci'])
    expect(parse([group]).help).toBe(true)
  expect(parse(['check']).help).toBe(false)
  for (const args of [['ops', 'unknown', '--help'], ['check', 'unknown', '-h'], ['maintenance', '--help']])
    expect(() => parse(args)).toThrow()
  expect(parse(['--help', 'ops', 'emergency-deploy']).invocation.path).toEqual(['ops', 'emergency-deploy'])
})

test('leaf help precedes required arguments and confirmation without executing', async () => {
  for (const args of [
    ['ops', 'emergency-deploy', '--yes', '--help'],
    ['ops', 'emergency-deploy', 'invalid', '--yes', '-h'],
    ['build', '--help'],
  ]) {
    expect(parse(args).help).toBe(true)
  }
  await expect(main(['ops', 'emergency-deploy', 'staging'])).rejects.toThrow('requires explicit --yes')
  await expect(main(['ops', 'emergency-deploy', 'invalid', '--yes'])).rejects.toThrow('Invalid environment')
  expect(() => parse(['build'])).toThrow('Missing argument')
  expect(() => parse(['dev', 'unexpected'])).toThrow('Unexpected argument')
  expect(() => parse(['ci', 'verify', '--yes'])).toThrow('Unknown option')
  expect(() => parse(['ci', 'deploy', 'staging', '--dry-run', '--dry-run'])).toThrow('Duplicate option')
})

test('removed spellings give replacement guidance and old entry point is absent', () => {
  expect(existsSync(resolve(root, 'tooling/repo/cli/main.ts'))).toBe(false)
  for (const [old, replacement] of Object.entries(removedCommands)) {
    const args = old.split(' ')
    // Option replacements need a valid enclosing path; all other paths resolve directly.
    expect(() => parse(args)).toThrow(replacement)
  }
})

test('documentation uses the complete command tree and detects drift', () => {
  expect(readFileSync(resolve(root, 'tooling/repo/ops/commands.txt'), 'utf8')).toBe(reference())
  expect(() => commandDocs(reference())).not.toThrow()
  const directory = mkdtempSync(resolve(tmpdir(), 'edaya-cli-docs-'))
  try {
    mkdirSync(resolve(directory, 'tooling/repo'), { recursive: true })
    writeFileSync(resolve(directory, 'tooling/repo/README.md'), '# Tooling\n\nKeep this introduction.\n<!-- repo-commands:start -->\nstale\n<!-- repo-commands:end -->\nKeep this footer.\n')
    expect(() => commandDocs(reference(), false, directory)).toThrow('drift')
    commandDocs(reference(), true, directory)
    expect(() => commandDocs(reference(), false, directory)).not.toThrow()
    const updated = readFileSync(resolve(directory, 'tooling/repo/README.md'), 'utf8')
    expect(updated).toStartWith('# Tooling\n\nKeep this introduction.\n')
    expect(updated).toEndWith('Keep this footer.\n')
  }
  finally { rmSync(directory, { recursive: true, force: true }) }
})

test('incomplete option values still allow help and values do not become help flags', () => {
  const path = ['ops', 'emergency-deploy', 'staging']
  expect(() => parse([...path, '--yes=false'])).toThrow('does not accept a value')
  expect(() => parse([...path, '--typo'])).toThrow('Unknown option')
})
