import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';

async function main() {
	ensurePlaywrightChromium();
	const appRoot = new URL('../..', import.meta.url).pathname;
	const fixture = `${appRoot}/tests/fixtures/attendance`;
	const mocks = ['$app/stores', '$lib/academic/context.svelte', '$lib/auth/session.svelte', '$lib/permissions', '$lib/api/school-client', '$lib/api/documents-data', '$lib/api/mutations/documents.mutations', '$lib/navigation/app-navigation'];
	const server = await createServer({ configFile: false, root: appRoot, cacheDir: 'node_modules/.vite-attendance',
		optimizeDeps: { entries: [`${fixture}/Harness.svelte`], include: ['@maya-invest/edaya-api-client', 'bits-ui', 'lucide-svelte', 'tailwind-merge'] },
		plugins: [{ name: 'attendance-fixture', enforce: 'pre',
			resolveId(source) {
				if (mocks.includes(source) || source === './app-navigation') return `${fixture}/environment.svelte.ts`;
				if (source === '$app/environment') return '\0fixture-environment';
				if (source === 'virtual:attendance-entry') return '\0fixture-entry';
			},
			load(id) {
				if (id === '\0fixture-environment') return 'export const browser = true;';
				if (id === '\0fixture-entry') return `import '/src/app.css'; import {mount} from 'svelte'; import Harness from '/tests/fixtures/attendance/Harness.svelte'; mount(Harness,{target:document.getElementById('app')});`;
			},
			configureServer(vite) {
				vite.middlewares.use((request, response, next) => {
					if (!request.url?.startsWith('/classes/')) return next();
					response.setHeader('Content-Type', 'text/html');
					response.end('<!doctype html><html><meta name="viewport" content="width=device-width, initial-scale=1"><body><div id="app"></div><script type="module" src="/@id/virtual:attendance-entry"></script></body></html>');
				});
			},
		}, svelte({ configFile: false })],
		resolve: { alias: [...mocks.map(find => ({ find, replacement: `${fixture}/environment.svelte.ts` })), { find: '$lib', replacement: `${appRoot}/src/lib` }] },
		server: { host: '127.0.0.1', port: 5199, strictPort: false, fs: { allow: [appRoot, `${appRoot}/../..`] } },
	});
	let browser;
	try {
		await server.listen();
		browser = await chromium.launch({ headless: true });
		const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
		await page.addInitScript(() => localStorage.setItem('lang', 'en'));
		page.setDefaultTimeout(15000);
		const errors: string[] = [];
		page.on('pageerror', error => errors.push(error.message));
		const address = server.httpServer!.address();
		assert(address && typeof address !== 'string');
		const base = `http://127.0.0.1:${address.port}/classes/a/attendance`;
		await page.goto(base);
		await page.getByTestId('ready').waitFor({ state: 'attached' });
		await page.getByRole('button', { name: 'New roll call', exact: true }).click();
		await page.getByRole('dialog').waitFor();
		assert(page.url().includes('modal=create-roll-call'));
		await page.getByLabel('Attendance for Alice Tremblay', { exact: true }).waitFor();
		assert(await page.getByTestId('form-modal-submit').isDisabled());
		await page.getByLabel('Date', { exact: true }).fill('2026-01-01');
		await page.getByLabel('Attendance for Alice Tremblay', { exact: true }).click();
		await page.getByRole('option', { name: 'Absent', exact: true }).click();
		await page.getByRole('button', { name: 'Mark all present', exact: true }).click();
		assert(await page.getByLabel('Attendance for Alice Tremblay', { exact: true }).innerText().then(text => text.includes('Absent')));
		assert(await page.getByTestId('form-modal-submit').isEnabled());
		mkdirSync('/private/tmp/edaya-attendance-evidence', { recursive: true });
		await page.getByLabel('Date', { exact: true }).click();
		await page.screenshot({ path: '/private/tmp/edaya-attendance-evidence/desktop.png' });
		await page.getByTestId('form-modal-submit').click();
		await page.getByRole('dialog').waitFor({ state: 'hidden' });
		await page.waitForURL('**/attendance/a%3A2026-01-01');
		const requests = JSON.parse(await page.getByTestId('requests').innerText());
		assert.deepEqual(requests[0].attendanceByStudent, { s1: 'absent', s2: 'present', s3: 'present' });
		await page.reload();
		await page.getByTestId('ready').waitFor({ state: 'attached' });
		assert.equal(await page.locator('[data-attendance-id="a:2026-01-01"]').count(), 1);
		await page.goto(`${base}?modal=create-roll-call`);
		await page.getByRole('dialog').waitFor();
		await page.getByLabel('Date', { exact: true }).fill('2026-01-01');
		assert(await page.getByTestId('form-modal-submit').isDisabled());
		await page.getByRole('button', { name: 'Open existing roll call' }).click();
		await page.getByRole('dialog').waitFor({ state: 'hidden' });
		await page.goto(base);
		await page.getByTestId('fail-write').click();
		await page.getByRole('button', { name: 'New roll call', exact: true }).click();
		await page.getByLabel('Date', { exact: true }).fill('2026-01-02');
		await page.getByRole('button', { name: 'Mark all present', exact: true }).click();
		await page.getByTestId('form-modal-submit').click();
		await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('[data-testid="form-modal-submit"]')?.disabled);
		assert.equal(await page.getByLabel('Date', { exact: true }).inputValue(), '2026-01-02');
		assert.equal(await page.getByRole('dialog').count(), 1);
		await page.getByTestId('form-modal-cancel').click();
		await page.getByTestId('denied').click();
		assert(await page.getByRole('button', { name: 'New roll call', exact: true }).isDisabled());
		await page.getByTestId('denied').click();
		await page.getByTestId('fail-roster').click();
		await page.getByRole('button', { name: 'New roll call', exact: true }).click();
		await page.getByRole('alert').filter({ hasText: 'Unable to load the complete' }).waitFor();
		assert(await page.getByTestId('form-modal-submit').isDisabled());
		await page.getByTestId('form-modal-cancel').click();
		await page.getByTestId('fail-roster').click();
		await page.getByTestId('empty').click();
		await page.getByRole('button', { name: 'New roll call', exact: true }).click();
		await page.getByText('No students', { exact: false }).waitFor();
		assert(await page.getByTestId('form-modal-submit').isDisabled());
		await page.getByTestId('form-modal-cancel').click();
		await page.getByTestId('empty').click();
		await page.getByTestId('fr').click();
		await page.setViewportSize({ width: 390, height: 700 });
		await page.getByRole('button', { name: 'Nouvel appel', exact: true }).click();
		await page.getByRole('dialog').waitFor();
		await page.getByLabel('Présence de Alice Tremblay', { exact: true }).waitFor();
		await page.screenshot({ path: '/private/tmp/edaya-attendance-evidence/mobile-fr.png' });
		assert(await page.getByTestId('form-modal-submit').isVisible());
		assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
		await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
		assert(await page.getByRole('dialog').evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth));
		const saveBounds = await page.getByTestId('form-modal-submit').boundingBox();
		assert(saveBounds && saveBounds.y >= 0 && saveBounds.y + saveBounds.height <= 700);
		await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
		await page.keyboard.press('Escape');
		await page.getByRole('dialog').waitFor({ state: 'hidden' });
		await page.goto(`${base}?denied=1&modal=create-roll-call`);
		await page.getByTestId('ready').waitFor({ state: 'attached' });
		assert(await page.getByRole('button', { name: 'New roll call', exact: true }).isDisabled());
		assert.equal(await page.getByRole('dialog').count(), 0);
		assert.deepEqual(errors, []);
		console.log('Attendance browser checks passed: creation, persistence, duplicates, failure drafts, permissions, roster errors, empty roster, FR/mobile and Escape.');
	}
	finally { await browser?.close(); await server.close(); }
}
await main();
