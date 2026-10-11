import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const web = resolve(import.meta.dirname, '../../..');
export function sourceFingerprint(): string {
  const hash = createHash('sha256');
  for (const directory of ['src', 'static', 'scripts', 'tests', '../webadmin/src', '../../tooling/repo']) {
    const root = resolve(web, directory);
    for (const file of readdirSync(root, { recursive: true, withFileTypes: true }).filter(entry => entry.isFile() && (directory === 'static' || /\.(?:ts|mjs|py|sh|svelte|css|json|svg)$/.test(entry.name))).sort((a, b) => `${a.parentPath}/${a.name}`.localeCompare(`${b.parentPath}/${b.name}`))) {
      hash.update(`${directory}/${file.parentPath.replace(root, '')}/${file.name}`);
      hash.update(readFileSync(resolve(file.parentPath, file.name)));
    }
  }
  const repository = resolve(web, '../..');
  for (const file of ['package.json', 'apps/webapp/package.json', 'apps/webadmin/package.json', 'apps/webapp/svelte.config.js', 'apps/webapp/vite.config.ts', 'apps/webadmin/svelte.config.js', 'apps/webadmin/vite.config.ts', 'bun.lock', 'design-system/tokens.json', '.generated/client.json']) {
    const path = resolve(repository, file);
    if (existsSync(path)) { hash.update(file); hash.update(readFileSync(path)); }
  }
  const backend = resolve(process.env.BACKEND_ROOT ?? resolve(repository, '.ci/edaya_backend'));
  if (existsSync(resolve(backend, '.git'))) hash.update(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: backend }));
  return hash.digest('hex');
}
export function beginExecution(directory: string): () => void {
  const metadata = { fingerprint: sourceFingerprint(), startedAt: new Date().toISOString(), completed: false };
  const path = resolve(directory, 'execution.json');
  writeFileSync(path, JSON.stringify(metadata));
  return () => {
    if (sourceFingerprint() !== metadata.fingerprint) throw new Error('Sources changed during integration execution; rerun the suite');
    writeFileSync(path, JSON.stringify({ ...metadata, completed: true, completedAt: new Date().toISOString() }));
  };
}
export function assertCurrentExecution(directory: string): void {
  const metadata = JSON.parse(readFileSync(resolve(directory, 'execution.json'), 'utf8'));
  if (!metadata.completed || metadata.fingerprint !== sourceFingerprint()) throw new Error(`Missing, incomplete or stale results in ${directory}; rerun the suite`);
}
