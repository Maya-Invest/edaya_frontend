import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { chromium } from 'playwright';
import { createFixtureServer } from './support/fixture-server';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';

async function main() {
	ensurePlaywrightChromium();
	const artifacts = process.env.INTEGRATION_ARTIFACT_DIR ?? '/private/tmp/edaya-guardian-profile-evidence';
	mkdirSync(artifacts, { recursive: true });
	const appRoot = new URL('../..', import.meta.url).pathname;
	const fixture = `${appRoot}/tests/fixtures/guardian-profile`;
	const mocks = ['$lib/api/mutations/run-mutation', '$app/stores', '$app/navigation', '$lib/academic/context.svelte', '$lib/auth/session.svelte', '$lib/permissions', '$lib/api/school-client', '$lib/entity-versions.svelte', '$lib/toast.svelte', '$lib/navigation/app-navigation'];
	const server = await createFixtureServer({ configFile: false, root: appRoot, cacheDir: 'node_modules/.vite-guardian-profile',
		optimizeDeps: { entries: [`${fixture}/Harness.svelte`], include: ['@maya-invest/edaya-api-client', 'bits-ui', 'lucide-svelte', 'tailwind-merge'] },
		plugins: [{ name: 'guardian-profile-fixture', enforce: 'pre',
			resolveId(source) {
				if (mocks.includes(source) || source === './app-navigation' || source === '../../guardians-page.svelte' || source === '../notification-settings-page.svelte') return `${fixture}/environment.svelte.ts`;
				if (source === '$app/environment') return '\0fixture-environment';
				if (source === '$env/static/public') return '\0fixture-public';
				if (source === 'virtual:guardian-profile-entry') return '\0fixture-entry';
			},
			load(id) {
				if (id === '\0fixture-environment') return 'export const browser = true; export const dev = true;';
				if (id === '\0fixture-public') return 'export const PUBLIC_API_URL = \"http://127.0.0.1:14243\"; export const PUBLIC_APP_ENV = \"test\";';
				if (id === '\0fixture-entry') return `import '/src/app.css'; import {mount} from 'svelte'; import Harness from '/tests/fixtures/guardian-profile/Harness.svelte'; mount(Harness,{target:document.getElementById('app')});`;
			},
			configureServer(vite) {
				vite.middlewares.use((request, response, next) => {
					if (!request.url?.startsWith('/school/') && !request.url?.startsWith('/classes/')) return next();
					response.setHeader('Content-Type', 'text/html');
					response.end('<!doctype html><html><meta name="viewport" content="width=device-width, initial-scale=1"><body><div id="app"></div><script type="module" src="/@id/virtual:guardian-profile-entry"></script></body></html>');
				});
			},
		}, svelte({ configFile: false })],
		resolve: { alias: [...mocks.map(find => ({ find, replacement: `${fixture}/environment.svelte.ts` })), { find: '$lib', replacement: `${appRoot}/src/lib` }] },
		server: { fs: { allow: [appRoot, `${appRoot}/../..`] } },
	}, 'guardian-profile', 14243, '/school/guardians/guardian');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(15000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    for (const fr of [false, true]) {
      await page.setViewportSize(fr ? { width: 390, height: 844 } : { width: 1280, height: 900 });
      await page.goto(`${server.url}?${fr ? 'fr&' : ''}fail`);
      await page.getByRole('button', { name: 'Edit guardian' }).click();
      const phone = page.getByLabel(fr ? 'Téléphone principal' : 'Main phone', { exact: true });
      const alternative = page.getByLabel(fr ? 'Téléphone secondaire' : 'Alternative phone', { exact: true });
      await phone.fill('+22509999999');
      await alternative.fill('+22508888888');
      const sms = page.getByRole('checkbox', { name: fr ? 'Notifications SMS' : 'SMS notifications', exact: true });
      await sms.focus(); await page.keyboard.press('Space');
      assert.equal(await sms.isChecked(), true);
      await page.getByTestId('form-modal-submit').click();
      assert.equal(await phone.inputValue(), '+22509999999');
      await page.screenshot({ path: resolve(artifacts, `guardian-${fr ? 'fr-mobile' : 'en-desktop'}.png`) });
      await page.getByTestId('form-modal-submit').click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      const requests = JSON.parse(await page.getByTestId('requests').innerText());
      assert.equal(requests.length, 2);
      assert.equal(requests[1].phone, '+22509999999');
      assert.equal(requests[1].alternativePhone, '+22508888888');
      assert.equal(requests[1].emailNotificationsEnabled, false);
      assert.equal(requests[1].pushNotificationsEnabled, false);
      assert(!('contactMethods' in requests[1]));
    }
    await page.goto(server.url);
    await page.getByRole('button', { name: 'Edit guardian' }).click();
    await page.getByLabel('Main phone', { exact: true }).fill('+22509999999');
    await page.keyboard.press('Escape');
    await page.getByText('Discard changes?', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Keep editing' }).click();
    await page.getByTestId('confirm-modal').waitFor({ state: 'hidden' });
    await page.getByLabel('Main phone', { exact: true }).focus();
    assert.equal(await page.getByLabel('Main phone', { exact: true }).inputValue(), '+22509999999');
    await page.getByTestId('form-modal-cancel').click();
    await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.goto(`${server.url}?settings&fail`);
    const email = page.getByLabel('Email', { exact: true });
    await email.fill('updated@example.test');
    await page.getByRole('checkbox', { name: 'Academic reports and grades', exact: true }).uncheck();
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    assert.equal(await email.inputValue(), 'updated@example.test');
    assert.equal(await page.getByTestId('saved').innerText(), '0');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="saved"]')?.textContent === '1');
    const requests = JSON.parse(await page.getByTestId('requests').innerText());
    assert.equal(requests.length, 2);
    assert.equal(requests[1].email, 'updated@example.test');
    assert.deepEqual(requests[1].studentNotificationPreferences, [{ studentId: 'child', receivesAcademicReports: false, receivesAttendanceAlerts: true }]);
    assert.equal(requests[1].smsNotificationsEnabled, false);
    assert(!('notificationEmail' in requests[1]));
    await page.goto(`${server.url}?settings&hold`);
    await page.getByLabel('Email', { exact: true }).fill('old-account@example.test');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="pending"]')?.textContent === 'true');
    await page.getByRole('button', { name: 'Change account', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="pending"]')?.textContent === 'false');
    assert.equal(await page.getByTestId('saved').innerText(), '0');
    assert.deepEqual(errors, []);
    console.log('Guardian profile browser coverage passed: FR/EN, mobile/desktop, keyboard, dirty dismissal, failure retry and atomic preferences.');
  } catch (error) { await page.screenshot({ path: resolve(artifacts, 'failure.png') }); console.error(await page.locator('body').innerText()); throw error; } finally { await browser.close(); await server.close(); }
}
await main();
