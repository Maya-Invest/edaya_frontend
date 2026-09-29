import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const web = resolve(import.meta.dirname, '../../..');
export function sourceFingerprint(): string {
  const hash = createHash('sha256');
  for (const directory of ['src', 'scripts', 'tests', '../webadmin/src']) {
    const root = resolve(web, directory);
    for (const file of readdirSync(root, { recursive: true, withFileTypes: true }).filter(entry => entry.isFile()).sort((a, b) => `${a.parentPath}/${a.name}`.localeCompare(`${b.parentPath}/${b.name}`))) {
      hash.update(`${directory}/${file.parentPath.replace(root, '')}/${file.name}`);
      hash.update(readFileSync(resolve(file.parentPath, file.name)));
    }
  }
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
