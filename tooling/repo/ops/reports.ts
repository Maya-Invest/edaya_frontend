import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, extname, relative, resolve } from 'node:path'
import { files, redact, root } from './runtime'

export function sanitizeReport(value: unknown): unknown {
  if (typeof value === 'string')
    return redact(value)
  if (Array.isArray(value))
    return value.map(sanitizeReport)
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, /password|token|secret|cookie|authorization|otp|recovery/i.test(key) ? '[REDACTED]' : sanitizeReport(entry)]))
  return value
}

/** Copy report outputs only; private fixture/session files never enter artifacts. */
export function collectReports(repository = root): void {
  const output = resolve(repository, '.ci-evidence/reports')
  rmSync(output, { recursive: true, force: true })
  mkdirSync(output, { recursive: true })
  const retained: string[] = []
  const json = (source: string): any => {
    try {
      return JSON.parse(readFileSync(source, 'utf8'))
    }
    catch {
      return { invalidReport: true, message: 'Incomplete JSON report' }
    }
  }
  const copy = (source: string, name: string) => {
    const destination = resolve(output, name)
    mkdirSync(dirname(destination), { recursive: true })
    if (extname(source) === '.json')
      writeFileSync(destination, `${JSON.stringify(sanitizeReport(json(source)), null, 2)}\n`)
    else if (extname(source) === '.csv')
      writeFileSync(destination, redact(readFileSync(source, 'utf8')))
    else
      cpSync(source, destination)
    retained.push(name)
  }
  for (const name of ['availability', 'onboarding', 'integration', 'webadmin', 'demo-dry-run']) {
    const directory = resolve(repository, 'apps/webapp', name === 'demo-dry-run' ? '.demo-dry-run' : `.${name}-run`)
    for (const source of files(directory)) {
      const path = relative(directory, source)
      const summary = ['summary.json', 'results.json', 'execution.json', 'qa-matrix-results.json'].includes(path)
      const diagnostic = /^artifacts\/[\w.-]+\.(?:json|png)$/.test(path)
        || (name === 'onboarding' && /^[\w.-]+\.(?:json|png)$/.test(path) && json(source.replace(/\.png$/, '.json')).scenarioId === path.replace(/\.(?:json|png)$/, ''))
        || (name === 'demo-dry-run' && /^(?:cleanup-[\w.-]+|D0-login)\.png$/.test(path))
      if (summary || diagnostic)
        copy(source, `${name}/${path}`)
    }
  }
  for (const name of ['qa-test-matrix.csv', 'qa-test-matrix-detailed.csv', 'qa-manual-checklist.csv', 'qa-checklist-results.json']) {
    const source = resolve(repository, name)
    if (existsSync(source))
      copy(source, name)
  }
  const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Integration reports</title><body><h1>Integration reports</h1><p>Sanitized reports and captured browser diagnostics.</p><ul>${retained.map(name => `<li><a href="${escape(name)}">${escape(name)}</a></li>`).join('')}</ul></body></html>`)
}
