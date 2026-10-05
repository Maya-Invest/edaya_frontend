import process from 'node:process'
import { repoRoot } from './paths'

export async function runBunScript(scriptPath: string, forwardArgs: readonly string[] = []): Promise<number> {
  const child = Bun.spawn(['bun', scriptPath, ...forwardArgs], {
    cwd: repoRoot,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
    env: process.env,
  })

  return await child.exited
}

export async function runRepoCommand(
  command: readonly string[],
  options?: { cwd?: string },
): Promise<number> {
  const child = Bun.spawn([...command], {
    cwd: options?.cwd ?? repoRoot,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
    env: process.env,
  })

  return await child.exited
}
