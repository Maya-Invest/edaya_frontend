import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { digest, root, run } from './runtime'

const platforms: Record<string, string> = { 'linux-x64': 'linux_amd64', 'linux-arm64': 'linux_arm64', 'darwin-arm64': 'darwin_arm64', 'darwin-x64': 'darwin_amd64' }
const actionlint: Record<string, string> = { linux_amd64: '8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8', linux_arm64: '325e971b6ba9bfa504672e29be93c24981eeb1c07576d730e9f7c8805afff0c6', darwin_arm64: 'aba9ced2dee8d27fecca3dc7feb1a7f9a52caefa1eb46f3271ea66b6e0e6953f', darwin_amd64: '5b44c3bc2255115c9b69e30efc0fecdf498fdb63c5d58e17084fd5f16324c644' }
const oasdiff: Record<string, string> = { darwin_all: '2aab1d33f3b9f9c28cd6c1977f63b1aa43ba83f9ab94887f3097fcac152d20a1', linux_amd64: '97f1052365f74e6fd6f4d8fa108606e09391aebb8ecbf3b5e7a4059d54327224', linux_arm64: '6a7394ec7129ccfbfcf4837db8426198b79e933341a96adf53b0f33498846b45' }
export async function tool(name: 'actionlint' | 'oasdiff'): Promise<string> {
  const version = name === 'actionlint' ? '1.7.12' : '1.11.7'
  const platform = name === 'oasdiff' && process.platform === 'darwin' ? 'darwin_all' : platforms[`${process.platform}-${process.arch}`]
  const expected = (name === 'actionlint' ? actionlint : oasdiff)[platform ?? '']
  if (!expected)
    throw new Error('Unsupported tool platform')
  const directory = resolve(root, '.cache/repo-tools', `${name}-${version}-${platform}`)
  const archive = resolve(directory, 'archive.tar.gz')
  mkdirSync(directory, { recursive: true })
  if (!existsSync(archive) || digest(readFileSync(archive)) !== expected) {
    const owner = name === 'actionlint' ? 'rhysd/actionlint' : 'oasdiff/oasdiff'
    const response = await fetch(`https://github.com/${owner}/releases/download/v${version}/${name}_${version}_${platform}.tar.gz`, { signal: AbortSignal.timeout(60000) })
    if (!response.ok)
      throw new Error(`Could not download ${name}`)
    const data = new Uint8Array(await response.arrayBuffer())
    if (digest(data) !== expected)
      throw new Error(`${name} checksum mismatch`)
    writeFileSync(archive, data)
  }
  await run(['tar', '-xzf', archive, '-C', directory, name], { quiet: true })
  const binary = resolve(directory, name)
  chmodSync(binary, 0o755)
  return binary
}
