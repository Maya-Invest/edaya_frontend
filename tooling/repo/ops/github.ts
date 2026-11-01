import { resolve } from 'node:path'
import { environment, root, run, writeJson } from './runtime'

export async function recordDeployment(target: string, action: () => Promise<void>): Promise<void> {
  environment(target)
  const evidence = { environment: target, sourceCommit: await run(['git', 'rev-parse', 'HEAD'], { quiet: true }), status: 'pending' }
  const save = () => writeJson(resolve(root, '.release/deployment.json'), evidence)
  const perform = async () => {
    evidence.status = 'in_progress'
    save()
    try {
      await action()
      evidence.status = 'success'
    }
    catch (error) {
      evidence.status = 'failure'
      throw error
    }
    finally { save() }
  }
  if (!process.env.GITHUB_REPOSITORY || !process.env.GITHUB_TOKEN) {
    await perform()
    return
  }
  const base = `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}`
  async function post(path: string, body: unknown): Promise<{
    id: number
  }> {
    const response = await fetch(`${base}/${path}`, { method: 'POST', headers: { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) })
    if (!response.ok)
      throw new Error('Could not record deployment status')
    return response.json() as Promise<{
      id: number
    }>
  }
  const deployment = await post('deployments', { ref: await run(['git', 'rev-parse', 'HEAD'], { cwd: root, quiet: true }), environment: target, task: 'edaya-release', auto_merge: false, required_contexts: [], production_environment: target === 'production' })
  await post(`deployments/${deployment.id}/statuses`, { state: 'in_progress' })
  try {
    await perform()
    await post(`deployments/${deployment.id}/statuses`, { state: 'success' })
  }
  catch (error) {
    await post(`deployments/${deployment.id}/statuses`, { state: 'failure' })
    throw error
  }
}
