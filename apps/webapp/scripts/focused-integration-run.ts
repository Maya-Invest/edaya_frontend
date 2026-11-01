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
  const entry = resolve(root, 'tests/integration', suite.script);
  let command = [process.execPath, entry];
  if ('runtime' in suite && suite.runtime === 'node') {
    // Playwright's response URL handling requires Node for this upload/download suite.
    const compiled = resolve(root, '.svelte-kit', `${suite.name}.mjs`);
    const build = Bun.spawn([process.execPath, 'build', entry, '--target=node', '--packages=external', `--outfile=${compiled}`], {
      cwd: root, stdout: 'inherit', stderr: 'inherit',
    });
    if (await build.exited !== 0) throw new Error(`Could not compile focused suite ${suite.name}`);
    command = ['node', compiled];
  }
  const child = Bun.spawn(command, {
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
