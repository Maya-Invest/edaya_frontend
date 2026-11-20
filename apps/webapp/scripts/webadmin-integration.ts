import { beginExecution } from '../tests/integration/support/execution-metadata';
import assert from 'node:assert/strict';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { waitForUrl } from '../../../tooling/repo/ops/runtime';
import { Services } from '../../../tooling/repo/ops/services';
import { navItems } from '../../webadmin/src/lib/config/navigation';
import scenarios from '../tests/integration/webadmin/scenarios.json';
const root = resolve(import.meta.dirname, '../../webadmin');
const out = resolve(import.meta.dirname, '../.webadmin-run');
mkdirSync(out, { recursive: true });
const completeExecution = beginExecution(out);
const routes = readdirSync(resolve(root, 'src/routes'), { recursive: true }).filter(file => String(file).endsWith('+page.svelte')).map(file => `/${String(file).replace(/\/?\+page\.svelte$/, '')}`);
assert.deepEqual(new Set(scenarios.map(row => row.route)), new Set(routes), 'Webadmin route inventory drift');
assert.deepEqual(new Set(navItems.map(row => row.href)), new Set(routes), 'Webadmin navigation drift');
assert.equal(new Set(scenarios.map(row => row.id)).size, scenarios.length, 'Duplicate webadmin IDs');
const services = new Services();
const base = 'http://127.0.0.1:14176';
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const outcomes = [];
try {
  // Keep Vite's watcher/bundler lifecycle outside the Bun test process. Vite
  // treats port 0 as its default port, which also reconnects unrelated HMR tabs.
  services.start('webadmin', ['bun', 'x', 'vite', 'dev', '--host', '127.0.0.1', '--port', '14176', '--strictPort'], root, { ...process.env, NODE_ENV: 'development' });
  await waitForUrl(base, 120, () => services.assertRunning());
  browser = await chromium.launch({ headless: true });
  for (const scenario of scenarios) {
    services.assertRunning();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    try {
      await page.goto(base);
      await page.locator('nav').locator(`a[href="${scenario.route}"]`).click();
      await page.getByRole('main').getByRole('heading', { name: scenario.heading, exact: true }).waitFor();
      assert.equal(new URL(page.url()).pathname, scenario.route);
      assert((await page.getByRole('main').innerText()).includes(scenario.placeholder));
      assert.equal(await page.getByRole('main').locator('input, form').count(), 0, 'Placeholder must not claim implemented workflows');
      outcomes.push({ id: scenario.id, status: 'passed' });
      console.log(`Webadmin ${scenario.id}: passed`);
    } catch (error) {
      await page.screenshot({ path: resolve(out, `${scenario.id}.png`) });
      outcomes.push({ id: scenario.id, status: 'failed', error: String(error) });
    } finally { await context.close(); }
  }
} finally {
  try {
    await browser?.close();
  } finally {
    await services.stop('webadmin-services.json');
    writeFileSync(resolve(out, 'summary.json'), JSON.stringify({ outcomes, limits: ['Future SaaS admin workflows are placeholders and are not counted as behavioral coverage.'] }, null, 2));
  }
}
assert(outcomes.length > 0 && outcomes.every(row => row.status === 'passed'), 'Webadmin integration failed');
completeExecution();
console.log(`Webadmin: ${outcomes.length} navigation and placeholder scenarios passed`);
