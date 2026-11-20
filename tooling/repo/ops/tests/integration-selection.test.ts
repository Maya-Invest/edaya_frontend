import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { expect, test } from 'bun:test'
import { BROWSER_SUITE_DIRECTORIES } from '../browser-suites'
import { resolveCommand } from '../command-tree'
import { commands } from '../commands'
import { beginIntegrationAttempt, selectedIntegrationSuite } from '../integration'

test('suite selection is explicit, bounded and available through both command entry points', () => {
  expect(selectedIntegrationSuite([])).toBeUndefined()
  for (const id of Object.keys(BROWSER_SUITE_DIRECTORIES)) {
    expect(selectedIntegrationSuite(['--suite', id])).toBe(id)
    for (const prefix of [['test', 'integration'], ['ci', 'browser-suites']])
      expect(resolveCommand(commands, [...prefix, '--suite', id]).invocation.options['--suite']).toBe(id)
  }
  for (const args of [['onboarding'], ['--suite'], ['--suite', 'missing'], ['--suite', '__proto__'], ['--suite', 'demo', '--suite', 'onboarding']])
    expect(() => selectedIntegrationSuite(args)).toThrow('Expected --suite')
})

test('selected execution clears successful qualification and stage evidence before preflight', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'edaya-selected-suite-'))
  try {
    mkdirSync(resolve(root, '.ci-evidence/stages'), { recursive: true })
    mkdirSync(resolve(root, '.release'))
    writeFileSync(resolve(root, '.ci-evidence/qualification.json'), '{"passed":true}')
    writeFileSync(resolve(root, '.ci-evidence/stages/integration.json'), '{"status":"passed"}')
    writeFileSync(resolve(root, '.release/manifest.json'), '{"status":"qualified","tests":["old"]}')
    beginIntegrationAttempt('new-attempt', 'onboarding', root)
    expect(existsSync(resolve(root, '.ci-evidence/qualification.json'))).toBe(false)
    expect(existsSync(resolve(root, '.ci-evidence/stages/integration.json'))).toBe(false)
    expect(JSON.parse(readFileSync(resolve(root, '.release/manifest.json'), 'utf8'))).toMatchObject({ status: 'built', tests: [] })
    expect(JSON.parse(readFileSync(resolve(root, '.ci-evidence/results.json'), 'utf8'))).toMatchObject({ passed: false, runId: 'new-attempt' })
  }
  finally { rmSync(root, { recursive: true, force: true }) }
})
