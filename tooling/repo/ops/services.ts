import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { redact, root, writeJson } from './runtime'
/** Services are owned by one invocation (process groups on Unix); never stop a shared port. */
export class Services {
  private children: ChildProcess[] = []
  private cancelled = false
  private failed = false
  private onSignal = () => {
    this.cancelled = true
    void this.stop().catch(() => {
    })
  }

  constructor(private echo = false) {
    process.once('SIGTERM', this.onSignal)
    process.once('SIGINT', this.onSignal)
  }

  assertRunning(): void {
    if (this.cancelled || this.failed || this.children.some(child => child.exitCode !== null || child.signalCode !== null))
      throw new Error('Owned service exited or was cancelled; see sanitized diagnostics')
  }

  private diagnostics: Record<string, string[]> = {}
  start(name: string, command: string[], cwd: string, env: NodeJS.ProcessEnv): ChildProcess {
    this.assertRunning()
    const lines: string[] = []
    this.diagnostics[name] = lines
    // Detaching on Windows creates a separate console window.
    const child = spawn(command[0]!, command.slice(1), { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32', windowsHide: true })
    this.children.push(child)
    const record = (line: string) => {
      lines.push(redact(line, env))
      if (this.echo)
        console.log(redact(line, env))
      if (lines.length > 50)
        lines.shift()
    }
    for (const stream of [child.stdout, child.stderr]) {
      if (stream)
        createInterface({ input: stream }).on('line', record)
    }
    child.on('error', () => {
      this.failed = true
      record('Service could not start')
    })
    child.on('exit', (code, signal) => record(`Service exited: ${code ?? signal}`))
    return child
  }

  async wait(): Promise<void> {
    while (!this.cancelled) {
      this.assertRunning()
      await Bun.sleep(200)
    }
  }

  private stopping?: Promise<void>
  async stop(file = 'services.json'): Promise<void> {
    await (this.stopping ??= this.terminate())
    writeJson(resolve(root, '.ci-evidence', file), this.diagnostics)
  }

  private async terminate(): Promise<void> {
    process.off('SIGINT', this.onSignal)
    process.off('SIGTERM', this.onSignal)
    for (const signal of ['SIGTERM', 'SIGKILL'] as const) {
      for (const child of this.children) {
        if (child.pid) {
          try {
            if (process.platform === 'win32')
              child.kill(signal)
            else
              process.kill(-child.pid, signal)
          }
          catch { /* already exited */
          }
        }
      }
      if (signal === 'SIGTERM')
        await Bun.sleep(500)
    }
    this.children = []
  }
}
