import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { expect, test } from 'bun:test'
import { Services } from '../services'

test('owned services capture output and stop their child processes', async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'edaya-services-'))
  const ready = resolve(directory, 'ready')
  const diagnostics = resolve(directory, 'services.json')
  const services = new Services()
  try {
    const child = services.start('test', [process.execPath, '-e', `console.log('service ready'); require('fs').writeFileSync(${JSON.stringify(ready)}, 'ready'); setInterval(() => {}, 1000)`], directory, process.env)
    for (let attempt = 0; attempt < 100 && !existsSync(ready); attempt++)
      await Bun.sleep(20)
    expect(existsSync(ready)).toBe(true)
    services.assertRunning()
    await services.stop(diagnostics)
    expect(child.exitCode !== null || child.signalCode !== null).toBe(true)
    expect(readFileSync(diagnostics, 'utf8')).toContain('service ready')
  }
  finally {
    await services.stop(diagnostics)
    rmSync(directory, { recursive: true, force: true })
  }
})
