import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { expect, test } from 'bun:test'
import { Services } from '../services'

test('service exit interrupts the active browser command', async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'edaya-browser-supervision-'))
  const services = new Services()
  try {
    services.start('preview', [process.execPath, '-e', 'setTimeout(() => process.exit(1), 200)'], directory, process.env)
    await expect(services.run([process.execPath, '-e', 'setInterval(() => {}, 1000)'], { cwd: directory, timeout: 3000 })).rejects.toThrow('owned service failed')
  }
  finally {
    await services.stop(resolve(directory, 'services.json'))
    rmSync(directory, { recursive: true, force: true })
  }
})

test('cancellation stops services and the supervised command without late writes', async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'edaya-browser-cancel-'))
  const script = resolve(directory, 'supervisor.ts')
  const serviceMarker = resolve(directory, 'service-leaked')
  const commandMarker = resolve(directory, 'command-leaked')
  const ready = resolve(directory, 'ready')
  const delayedWrite = (marker: string) => `setTimeout(() => require('fs').writeFileSync(${JSON.stringify(marker)}, 'leaked'), 1500)`
  writeFileSync(script, `
    import { Services } from ${JSON.stringify(resolve(import.meta.dirname, '../services.ts'))};
    const services = new Services();
    services.start('preview', [process.execPath, '-e', ${JSON.stringify(delayedWrite(serviceMarker))}], ${JSON.stringify(directory)}, process.env);
    try { await services.run([process.execPath, '-e', ${JSON.stringify(`require('fs').writeFileSync(${JSON.stringify(ready)}, 'ready'); ${delayedWrite(commandMarker)}`)}], { quiet: true }); }
    finally { await services.stop(${JSON.stringify(resolve(directory, 'services.json'))}); }
  `)
  const child = Bun.spawn([process.execPath, script], { stdout: 'ignore', stderr: 'ignore' })
  try {
    for (let attempt = 0; attempt < 100 && !existsSync(ready); attempt++) await Bun.sleep(20)
    expect(existsSync(ready)).toBe(true)
    child.kill('SIGTERM')
    expect(await child.exited).not.toBe(0)
    await Bun.sleep(1600)
    expect(existsSync(serviceMarker)).toBe(false)
    expect(existsSync(commandMarker)).toBe(false)
  }
  finally {
    child.kill()
    await child.exited
    rmSync(directory, { recursive: true, force: true })
  }
}, 10000)
