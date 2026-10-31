import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { createInterface } from 'node:readline'

export const root = resolve(import.meta.dirname, '../../..')
export type Environment = 'staging' | 'production'
export function environment(value: string | undefined): Environment {
  if (value !== 'staging' && value !== 'production')
    throw new Error('Expected staging or production')
  return value
}
export function backendBranch(target: string): string {
  if (target === 'main' || target === 'production')
    return 'main'
  if (target === 'staging')
    return 'staging'
  throw new Error('Expected main, staging, or production')
}
export function sha(value: string): string {
  if (!/^[a-f0-9]{40}$/.test(value))
    throw new Error('Expected immutable Git commit')
  return value
}
export function redact(text: string, environment: NodeJS.ProcessEnv = {}): string {
  for (const [key, value] of Object.entries({ ...process.env, ...environment })) {
    if (/SECRET|TOKEN|PASSWORD|SIGNING_BUNDLE|PRIVATE_KEY/.test(key) && value && value.length > 4) {
      for (const line of value.split('\n').filter(line => line.length > 4))
        text = text.replaceAll(line, '[REDACTED]')
    }
  }
  return text.replace(/(?:https?|postgres(?:ql)?):\/\/[^/\s@]+@/g, 'https://[REDACTED]@')
    .replace(/(?:Bearer|Basic)\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/((?:password|secret|token|authorization|cookie|otp|recoveryCode)\s*(?:["']\s*)?[:=]\s*["']?)[^\s"',}]+/gi, '$1[REDACTED]')
    .replace(/\/invite\/[^\s/?"']+/g, '/invite/[REDACTED]')
    .replace(/(?<!\d)\d{6}(?!\d)/g, '[REDACTED]')
}
export interface RunOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  timeout?: number
  quiet?: boolean
  inheritInput?: boolean
  input?: string
  inheritEnv?: boolean
  signal?: AbortSignal
}
export async function run(command: readonly string[], options: RunOptions = {}): Promise<string> {
  options.signal?.throwIfAborted()
  const [executable, ...args] = command
  if (!executable)
    throw new Error('Empty command')
  return new Promise((accept, reject) => {
    const child = spawn(executable, args, { cwd: options.cwd ?? root, env: options.inheritEnv === false ? options.env : { ...process.env, ...options.env }, stdio: [options.input !== undefined ? 'pipe' : options.inheritInput ? 'inherit' : 'ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32', windowsHide: true })
    let output = ''
    let interruption: string | undefined
    const kill = (reason: string) => {
      if (interruption)
        return
      interruption = reason
      if (child.pid) {
        try {
          process.kill(process.platform === 'win32' ? child.pid : -child.pid, 'SIGTERM')
        }
        catch { /* already exited */
        }
        const force = setTimeout(() => {
          try {
            process.kill(process.platform === 'win32' ? child.pid! : -child.pid!, 'SIGKILL')
          }
          catch { /* already exited */
          }
        }, 2000)
        force.unref()
      }
    }
    const timer = options.timeout === 0 ? undefined : setTimeout(kill, options.timeout ?? 30 * 60000, `timed out after ${options.timeout ?? 30 * 60000}ms`)
    const abort = () => kill('owned service failed or was cancelled')
    options.signal?.addEventListener('abort', abort, { once: true })
    if (options.signal?.aborted)
      abort()
    const interrupt = () => kill('interrupted by SIGINT')
    const terminate = () => kill('interrupted by SIGTERM')
    process.once('SIGINT', interrupt)
    process.once('SIGTERM', terminate)
    const cleanup = () => {
      if (timer)
        clearTimeout(timer)
      options.signal?.removeEventListener('abort', abort)
      process.off('SIGINT', interrupt)
      process.off('SIGTERM', terminate)
    }
    child.stdout!.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    createInterface({ input: child.stdout! }).on('line', (line) => {
      if (!options.quiet)
        process.stdout.write(`${redact(line, options.env)}\n`)
    })
    createInterface({ input: child.stderr! }).on('line', (line) => {
      if (!options.quiet)
        process.stderr.write(`${redact(line, options.env)}\n`)
    })
    if (options.input !== undefined) {
      child.stdin?.on('error', () => { /* A command may exit before reading its input. */ })
      child.stdin?.end(options.input)
    }
    child.on('error', () => {
      cleanup()
      reject(new Error(`Could not start ${executable}`))
    })
    child.on('close', (code, signal) => {
      cleanup()
      if (code !== 0 || interruption)
        reject(new Error(`${executable} ${interruption ?? (signal ? `terminated by ${signal}` : `exited ${code}`)}`))
      else
        accept(output.trim())
    })
  })
}
export function files(path: string): string[] {
  if (!existsSync(path))
    return []
  return readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => entry.isDirectory() ? files(join(path, entry.name)) : entry.isFile() ? [join(path, entry.name)] : [])
}
export const digest = (data: string | Uint8Array): string => createHash('sha256').update(data).digest('hex')
export function hashes(directory: string): Record<string, string> {
  return Object.fromEntries(files(directory).map(file => [relative(directory, file), digest(readFileSync(file))]))
}
export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}
export function githubOutput(name: string, value: string): void {
  if (!/^[a-z_]+$/.test(name) || /[\r\n]/.test(value))
    throw new Error('Invalid workflow output')
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`)
}
export async function waitForUrl(url: string, seconds = 120, assertActive: () => void = () => {
}): Promise<void> {
  const end = Date.now() + seconds * 1000
  while (Date.now() < end) {
    assertActive()
    let ready = false
    try {
      const response = await fetch(url, { headers: { accept: 'text/html, application/json' }, signal: AbortSignal.timeout(2000) })
      await response.body?.cancel()
      ready = response.ok
    }
    catch { /* still starting */
    }
    assertActive()
    if (ready)
      return
    await Bun.sleep(500)
  }
  throw new Error('Service readiness timed out')
}
/** Credentials stay in process environment, never command arguments or git config files. */
export function gitEnvironment(token = process.env.GITHUB_TOKEN): NodeJS.ProcessEnv {
  return token ? { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader', GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}` } : {}
}
export async function verifyBackend(backend: string, expected: string): Promise<void> {
  if (await run(['git', 'rev-parse', 'HEAD'], { cwd: backend, quiet: true }) !== sha(expected))
    throw new Error('Integration backend differs from prepared client')
  if (await run(['git', 'status', '--porcelain', '--untracked-files=no'], { cwd: backend, quiet: true }))
    throw new Error('Integration backend has modified source')
}
export async function assertCommittedSource(allowed: string[] = []): Promise<void> {
  for (const args of [['diff', '--name-only', 'HEAD'], ['ls-files', '--others', '--exclude-standard']]) {
    const paths = await run(['git', ...args], { quiet: true })
    if (paths.split('\n').some(path => path && !allowed.includes(path)))
      throw new Error('Deployment requires an unchanged qualified checkout')
  }
}
