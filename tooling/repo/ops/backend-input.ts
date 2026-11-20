import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { backendBranch, gitEnvironment, githubOutput, run, sha } from './runtime'

const repository = 'https://github.com/Maya-Invest/edaya_backend.git'
export async function resolveBackend(requested: string, matching: boolean, execute = run) {
  const env = gitEnvironment(process.env.BACKEND_CHECKOUT_TOKEN)
  if (!requested || requested.startsWith('-') || /[\r\n]/.test(requested))
    throw new Error('Invalid backend reference')
  let selected = requested
  let commit: string
  if (matching) {
    await execute(['git', 'check-ref-format', `refs/heads/${requested}`], { quiet: true })
    // Successful empty output means absent; authentication and transport failures throw.
    const refs = await execute(['git', 'ls-remote', '--heads', repository], { quiet: true, env })
    const branches = new Map(refs.split('\n').filter(Boolean).map((line) => {
      const [hash, ref] = line.split(/\s+/)
      return [ref, hash] as const
    }))
    if (!branches.has(`refs/heads/${requested}`))
      selected = 'dev'
    const found = branches.get(`refs/heads/${selected}`)
    if (!found)
      throw new Error(`Backend branch ${requested} is absent and fallback dev is absent in Maya-Invest/edaya_backend`)
    commit = sha(found)
  }
  else {
    const directory = mkdtempSync(resolve(tmpdir(), 'edaya-backend-ref-'))
    try {
      await execute(['git', 'init', directory], { quiet: true })
      await execute(['git', 'fetch', '--depth=1', repository, requested], { cwd: directory, quiet: true, env })
      commit = sha(await execute(['git', 'rev-parse', 'FETCH_HEAD^{commit}'], { cwd: directory, quiet: true }))
    }
    finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }
  return { requested, selected, commit, fallback: selected !== requested }
}

export function assertBackendCompatible(backend: string) {
  const paths = ['package.json', ...new Bun.Glob('{apps,package,tooling}/*/package.json').scanSync({ cwd: backend })]
  for (const path of paths) {
    const manifest = JSON.parse(readFileSync(resolve(backend, path), 'utf8'))
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies', 'overrides', 'resolutions']) {
      if (JSON.stringify(manifest[field] ?? {}).includes('edaya-identity-client') || JSON.stringify(manifest[field] ?? {}).includes('../edaya_identity/'))
        throw new Error(`Backend ${path} still requires the retired edaya_identity package. Select or promote a backend revision with the in-repository identity migration.`)
    }
  }
}

if (import.meta.main) {
  const result = await resolveBackend(process.env.BACKEND_REF || backendBranch(process.env.TARGET!), process.env.MATCH_BRANCH === 'true')
  githubOutput('commit', result.commit)
  const summary = `Backend input: ${JSON.stringify(result)}\n`
  process.stdout.write(summary)
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n${result.fallback ? 'Matching branch absent; selected backend dev.' : 'Requested backend reference selected.'}\n`)
}
