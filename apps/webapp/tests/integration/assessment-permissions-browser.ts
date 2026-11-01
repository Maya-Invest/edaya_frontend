import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { chromium } from 'playwright';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';
import { createFixtureServer } from './support/fixture-server';

async function main() {
	ensurePlaywrightChromium();
	const artifacts = process.env.INTEGRATION_ARTIFACT_DIR ?? resolve(import.meta.dirname, '../../.focused-run/assessment-permissions');
	mkdirSync(artifacts, { recursive: true });
	const appRoot = new URL('../..', import.meta.url).pathname;
	const fixture = `${appRoot}/tests/fixtures/assessment-permissions`;
	process.chdir(appRoot);
	const server = await createFixtureServer({
		configFile: false,
		root: appRoot,
		publicDir: `${appRoot}/static`,
		cacheDir: 'node_modules/.vite-assessment-permissions',
		optimizeDeps: { entries: [`${fixture}/Harness.svelte`], include: ['@maya-invest/edaya-api-client', 'bits-ui', 'lucide-svelte', 'tailwind-merge'] },
		plugins: [{
			name: 'assessment-permissions-fixture',
			enforce: 'pre',
			resolveId(source) {
				if (source.includes('evaluations-page.svelte'))
					return `${fixture}/environment.svelte.ts`;
				if (source === '$app/stores' || source === '$app/navigation')
					return `${fixture}/navigation.ts`;
				if (source === '$app/environment')
					return '\0assessment-environment';
				if (source === 'virtual:assessment-entry')
					return '\0assessment-entry';
			},
			load(id) {
				if (id === '\0assessment-environment')
					return 'export const browser = true;';
				if (id === '\0assessment-entry')
					return `import '/src/app.css'; import {mount} from 'svelte'; import Harness from '/tests/fixtures/assessment-permissions/Harness.svelte'; mount(Harness,{target:document.getElementById('app')});`;
			},
			configureServer(vite) {
				vite.middlewares.use('/assessment-fixture', (_request, response) => {
					response.setHeader('Content-Type', 'text/html');
					response.end('<!doctype html><html><body><div id="app"></div><script type="module" src="/@id/virtual:assessment-entry"></script></body></html>');
				});
			},
		}, svelte({ configFile: false })],
		resolve: { alias: [
			{ find: '$lib/navigation/route-surface-navigation', replacement: `${fixture}/navigation.ts` },
			{ find: '$lib/navigation/app-navigation', replacement: `${fixture}/navigation.ts` },
			{ find: '$lib/permissions', replacement: `${fixture}/environment.svelte.ts` },
			{ find: '$lib/academic/context.svelte', replacement: `${fixture}/environment.svelte.ts` },
			{ find: '$lib', replacement: `${appRoot}/src/lib` },
		] },
		server: { fs: { allow: [appRoot, `${appRoot}/../..`] } },
	}, 'assessment-permissions', Number(process.env.EDAYA_ASSESSMENT_FIXTURE_PORT ?? 14179), '/assessment-fixture');
	const browser = await chromium.launch({ headless: true });
	try {
		for (const locale of ['en', 'fr']) {
			const page = await browser.newPage({ viewport: locale === 'en' ? { width: 1440, height: 900 } : { width: 390, height: 844 } });
			page.setDefaultTimeout(30_000);
			const errors: string[] = [];
			page.on('response', (response) => {
				if (response.status() >= 400)
					console.error(response.status(), response.url());
			});
			page.on('console', (message) => {
				if (message.type() === 'error')
					console.error(message.text());
			});
			page.on('pageerror', (error) => {
				errors.push(error.message);
				console.error(error.message);
			});
			await page.addInitScript(lang => localStorage.setItem('lang', lang), locale);
			await page.goto(server.url);
			await page.getByTestId('collection-menu').click();
			const create = page.getByRole('menuitem', { name: locale === 'en' ? /Add evaluation/i : /Ajouter une évaluation/i });
			try {
				await create.waitFor({ timeout: 60_000 });
			}
			catch (error) {
				console.error(await page.locator('body').textContent());
				await page.screenshot({ path: resolve(artifacts, 'assessment-browser-failure.png'), fullPage: true });
				throw error;
			}
			assert.equal(await create.isDisabled(), false, 'Setup authority can create assessments');
			await page.keyboard.press('Escape');
			assert.equal(await page.getByText('2/2', { exact: true }).count(), 0, 'Unreadable marks do not show numeric progress');
			assert.equal(await page.getByTestId('group').textContent(), locale === 'en' ? 'Assessments and marks' : 'Évaluations et notes');
			await page.getByTestId('marker').click();
			await page.getByText('2/2', { exact: true }).waitFor();
			await page.getByText('16.00', { exact: false }).waitFor();
			await page.getByTestId('collection-menu').click();
			assert.equal(await create.count(), 0, 'Unauthorized collection action must be hidden; direct URL guards are checked below');
			await page.keyboard.press('Escape');
			await page.getByTestId('edit').click();
			const submit = page.getByTestId('form-modal-submit');
			await submit.waitFor();
			assert.equal(await submit.isDisabled(), true, 'Direct edit URL cannot bypass the setup permission');
			await page.keyboard.press('Escape');
			await page.getByRole('dialog').waitFor({ state: 'hidden' });
			await page.getByTestId('delete').click();
			const confirmDelete = page.getByTestId('confirm-modal').getByRole('button', { name: locale === 'en' ? 'Delete' : 'Supprimer', exact: true });
			await confirmDelete.waitFor();
			assert.equal(await confirmDelete.isDisabled(), true, 'Mark entry alone cannot delete through a direct URL');
			await page.keyboard.press('Escape');
			await page.getByRole('dialog').waitFor({ state: 'hidden' });
			await page.getByTestId('setup').click();
			assert.equal(await page.locator('[data-testid="drawer-tab-bar"] a').count(), 1, 'Setup-only user has no marks tab');
			await page.getByTestId('edit').click();
			await submit.waitFor();
			assert.equal(await submit.isDisabled(), false, 'Setup authority can edit its own subject');
			await submit.click();
			await page.getByRole('dialog').waitFor({ state: 'hidden' });
			assert.equal(await page.getByTestId('requests').textContent(), '["update"]');
			await page.getByTestId('delete').click();
			await confirmDelete.waitFor();
			assert.equal(await confirmDelete.isDisabled(), false, 'Assessment management can delete its covered assessment');
			await confirmDelete.click();
			await page.getByRole('dialog').waitFor({ state: 'hidden' });
			assert.equal(await page.getByTestId('requests').textContent(), '["update","delete"]');
			await page.getByTestId('other').click();
			await page.getByTestId('edit').click();
			await submit.waitFor();
			assert.equal(await submit.isDisabled(), true, 'Another subject does not confer edit authority');
			await page.keyboard.press('Escape');
			assert.deepEqual(errors, []);
			await page.screenshot({ path: resolve(artifacts, `assessment-permissions-${locale}.png`), fullPage: true });
			await page.close();
			process.stdout.write(`Assessment permission controls and progress: ${locale} passed\n`);
		}
	}
	finally {
		await browser.close();
		await server.close();
	}
}
void main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
