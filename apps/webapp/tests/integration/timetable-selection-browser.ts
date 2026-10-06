import assert from 'node:assert/strict';
import process from 'node:process';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';

async function main() {
	ensurePlaywrightChromium();
	const appRoot = new URL('../..', import.meta.url).pathname;
	const fixture = `${appRoot}/tests/fixtures/timetable-modal`;
	const server = await createServer({
		configFile: false,
		root: appRoot,
		plugins: [{
			name: 'timetable-modal-fixture',
			enforce: 'pre',
			resolveId(source) {
				if (source.includes('tools-page.svelte'))
					return `${fixture}/action-state.ts`;
				if (source === '$app/environment')
					return '\0fixture-environment';
				if (source === 'virtual:timetable-entry')
					return '\0fixture-entry';
			},
			load(id) {
				if (id === '\0fixture-environment')
					return 'export const browser = true;';
				if (id === '\0fixture-entry')
					return `import '/src/app.css'; import {mount} from 'svelte'; import Harness from '/tests/fixtures/timetable-modal/Harness.svelte'; mount(Harness,{target:document.getElementById('app')});`;
			},
			configureServer(vite) {
				vite.middlewares.use('/timetable-fixture', (_request, response) => {
					response.setHeader('Content-Type', 'text/html');
					response.end('<!doctype html><html><body><div id="app"></div><script type="module" src="/@id/virtual:timetable-entry"></script></body></html>');
				});
			},
		}, svelte({ configFile: false })],
		resolve: { alias: [{ find: '$lib/academic/context.svelte', replacement: `${fixture}/academic-context.svelte.ts` }, { find: '$lib', replacement: `${appRoot}/src/lib` }] },
		server: { host: '127.0.0.1', port: 5197, strictPort: true, fs: { allow: [appRoot, `${appRoot}/../..`] } },
	});
	let browser;
	try {
		await server.listen();
		const address = server.httpServer!.address();
		assert(address && typeof address !== 'string');
		browser = await chromium.launch({ headless: true });
		const page = await browser.newPage();
		page.setDefaultTimeout(15_000);
		const pageErrors: string[] = [];
		page.on('pageerror', (error) => {
			pageErrors.push(error.message);
			console.error(error.stack);
		});
		await page.goto(`http://127.0.0.1:${address.port}/timetable-fixture`);
		const boxes = page.getByTestId('timetable-class-checkbox');
		await boxes.first().waitFor();
		assert.equal(await boxes.count(), 3);
		for (const box of await boxes.all()) assert(await box.isChecked());
		if (process.env.TIMETABLE_SELECTION_SCREENSHOT)
			await page.screenshot({ path: process.env.TIMETABLE_SELECTION_SCREENSHOT });
		await page.getByTestId('timetable-clear-selection').click();
		assert(await page.getByTestId('timetable-generate-submit').isDisabled());
		await page.getByTestId('timetable-select-all').click();
		const search = page.getByTestId('timetable-class-selection').getByTestId('list-search');
		await search.fill('Class B');
		assert.equal(await boxes.count(), 1);
		await boxes.first().uncheck();
		await search.fill('');
		assert(await boxes.nth(0).isChecked());
		assert(!(await boxes.nth(1).isChecked()));
		assert(await boxes.nth(2).isChecked());
		assert.equal(await page.getByTestId('timetable-workload-class').count(), 2);
		await page.getByTestId('timetable-workload-periods').first().fill('4');
		await boxes.nth(0).uncheck();
		await boxes.nth(0).check();
		await page.getByTestId('timetable-workload-class').filter({ hasText: 'Class A' }).click();
		assert.equal(await page.getByTestId('timetable-workload-periods').first().inputValue(), '4');
		await page.getByTestId('timetable-generate-submit').click();
		assert.equal(await boxes.count(), 0, 'Selection controls must be hidden during generation');
		const requests = JSON.parse(await page.getByTestId('fixture-requests').textContent() ?? '[]');
		assert.deepEqual(requests[0].classGroupIds, ['c', 'a']);
		assert.equal(requests[0].periodsPerWeekByClassSubjectId['subject-a'], 4);
		await page.getByTestId('fixture-finish').dispatchEvent('click');
		await page.getByRole('button', { name: /run again|relancer/i }).click();
		assert(await boxes.nth(0).isChecked());
		assert(!(await boxes.nth(1).isChecked()));
		assert.equal(await page.getByTestId('timetable-workload-periods').first().inputValue(), '4');
		await page.getByTestId('fixture-year').dispatchEvent('click');
		await page.waitForFunction(() => document.querySelector('[data-testid="timetable-class-checkbox"]')?.getAttribute('data-class-id') === 'other-class');
		assert.equal(await boxes.count(), 1);
		assert(await boxes.first().isChecked());
		await boxes.first().uncheck();
		await page.getByTestId('fixture-school').dispatchEvent('click');
		await page.waitForFunction(() => document.querySelector('[data-testid="timetable-class-checkbox"]')?.getAttribute('aria-checked') === 'true');
		await page.getByRole('button', { name: /cancel|annuler/i }).click();
		await page.getByTestId('fixture-open').click();
		assert(await boxes.first().isChecked());
		assert.deepEqual(pageErrors, []);
		process.stdout.write('Timetable modal browser checks passed: defaults, search, selection, subject scoping, overrides, busy state, retries, and school/year reset.\n');
	}
	finally {
		await browser?.close();
		await server.close();
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
