import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { chromium } from 'playwright';
import { createFixtureServer } from './support/fixture-server';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';

async function main() {
	ensurePlaywrightChromium();
	const artifacts = process.env.INTEGRATION_ARTIFACT_DIR ?? '/private/tmp/edaya-subject-enrollment-evidence';
	mkdirSync(artifacts, { recursive: true });
	const appRoot = new URL('../..', import.meta.url).pathname;
	const fixture = `${appRoot}/tests/fixtures/subject-enrollment`;
	const mocks = ['$app/stores', '$lib/academic/context.svelte', '$lib/permissions', '$lib/navigation/app-navigation'];
	const server = await createFixtureServer({ configFile: false, root: appRoot, cacheDir: 'node_modules/.vite-subject-enrollment',
		optimizeDeps: { entries: [`${fixture}/Harness.svelte`], include: ['@maya-invest/edaya-api-client', 'bits-ui', 'lucide-svelte', 'tailwind-merge'] },
		plugins: [{ name: 'subject-enrollment-fixture', enforce: 'pre',
			resolveId(source) {
				if (mocks.includes(source) || source === './app-navigation' || source === './student-enrollments-tab.svelte') return `${fixture}/environment.svelte.ts`;
				if (source === '$app/environment') return '\0fixture-environment';
				if (source === 'virtual:subject-enrollment-entry') return '\0fixture-entry';
			},
			load(id) {
				if (id === '\0fixture-environment') return 'export const browser = true;';
				if (id === '\0fixture-entry') return `import '/src/app.css'; import {mount} from 'svelte'; import Harness from '/tests/fixtures/subject-enrollment/Harness.svelte'; mount(Harness,{target:document.getElementById('app')});`;
			},
			configureServer(vite) {
				vite.middlewares.use((request, response, next) => {
					if (!request.url?.startsWith('/school/')) return next();
					response.setHeader('Content-Type', 'text/html');
					response.end('<!doctype html><html><meta name="viewport" content="width=device-width, initial-scale=1"><body><div id="app"></div><script type="module" src="/@id/virtual:subject-enrollment-entry"></script></body></html>');
				});
			},
		}, svelte({ configFile: false })],
		resolve: { alias: [...mocks.map(find => ({ find, replacement: `${fixture}/environment.svelte.ts` })), { find: '$lib', replacement: `${appRoot}/src/lib` }] },
		server: { fs: { allow: [appRoot, `${appRoot}/../..`] } },
	}, 'subject-enrollment', 14239, '/school/students/child/enrollments');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(15000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(server.url);
    await page.getByTestId('fail').click();
    await page.getByRole('button', { name: 'Enroll · Music' }).click();
    await page.getByRole('dialog').waitFor();
    assert(new URL(page.url()).searchParams.get('modal') === 'subject-selection');
    await page.getByRole('checkbox', { name: 'Term 1' }).click();
    await page.getByTestId('form-modal-submit').click();
    assert.equal(await page.getByRole('checkbox', { name: 'Term 1' }).isChecked(), true);
    await page.screenshot({ path: resolve(artifacts, 'enrollment-desktop.png') });
    await page.getByTestId('form-modal-submit').click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    const requests = JSON.parse(await page.getByTestId('requests').innerText());
    assert.equal(requests.length, 2);
    assert.equal(requests[0].requestId, requests[1].requestId);
    assert.deepEqual(requests[0].operations[0].selection, { scope: 'periods', periodIds: ['term'] });
    assert.equal(requests[0].expectedRevisions.music, 3);
    await page.getByRole('button', { name: 'Update · Music' }).click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.getByRole('checkbox', { name: 'Term 1' }).isChecked(), true);
    await page.getByRole('button', { name: 'Clear selection' }).click();
    await page.getByTestId('form-modal-submit').click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    const withdrawal = JSON.parse(await page.getByTestId('requests').innerText()).at(-1).operations[0];
    assert.deepEqual(withdrawal.selection, { scope: 'none' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId('fr').click();
    await page.screenshot({ path: resolve(artifacts, 'enrollment-mobile-fr.png') });
    await page.goto(`${server.url}?denied&modal=subject-selection&modalTarget=music`);
    await page.getByTestId('fail').waitFor();
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Enroll · Music' }).count(), 0);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await server.close(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
