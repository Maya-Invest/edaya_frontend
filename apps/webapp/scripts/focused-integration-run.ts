import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FOCUSED_BROWSER_SUITES } from '../../../tooling/repo/ops/browser-suites';
import { beginExecution } from '../tests/integration/support/execution-metadata';

const suite = FOCUSED_BROWSER_SUITES.find(suite => suite.name === process.argv[2]);
if (!suite) throw new Error('Expected a registered focused browser suite');
const root = resolve(import.meta.dirname, '..');
const directory = resolve(root, '.focused-run', suite.name);
mkdirSync(directory, { recursive: true });
const complete = beginExecution(directory);
const started = Date.now();
let exitCode = 1;
try {
  const child = Bun.spawn([process.execPath, resolve(root, 'tests/integration', suite.script)], {
    cwd: root, stdout: 'inherit', stderr: 'inherit',
    env: { ...process.env, INTEGRATION_ARTIFACT_DIR: directory },
  });
  exitCode = await child.exited;
} finally {
  writeFileSync(resolve(directory, 'summary.json'), JSON.stringify({
    ok: exitCode === 0, exitCode,
    outcomes: [{ id: `web.focused.${suite.name}`, feature: suite.name,
      status: exitCode === 0 ? 'passed' : 'failed', durationMs: Date.now() - started }],
  }, null, 2));
  complete();
}
process.exitCode = exitCode;
