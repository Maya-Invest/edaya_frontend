import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const base = process.env.TERMS_TEST_BASE ?? 'http://127.0.0.1:5193';
const output = resolve('.focused-run/terms');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors: string[] = [];
try {
	for (const locale of ['en', 'fr']) {
		for (const panel of ['signin', 'signup']) {
			const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', colorScheme: 'dark' });
			const page = await context.newPage();
			page.setDefaultTimeout(60000);
			page.on('pageerror', error => errors.push(error.message));
			let failTerms = false;
			let version = 'v1';
			const requests: Record<string, unknown>[] = [];
			await page.route('http://localhost:9999/**', async (route) => {
				const url = new URL(route.request().url());
				let body: unknown = {};
				let status = 200;
				if (url.pathname.endsWith('/terms')) {
					status = failTerms ? 503 : 200;
					const french = url.searchParams.get('locale') === 'fr';
					body = { enforced: true, document: { version, locale: url.searchParams.get('locale'), status: 'published', title: french ? 'Conditions d’utilisation — exemple de test' : 'Terms of Use — test example', documentHash: `${version}-${url.searchParams.get('locale')}`, sourceUrl: french ? 'https://edayaplus.com/conditions-utilisation/' : 'https://edayaplus.com/en/terms/', html: `<h1>${french ? 'Conditions' : 'Terms'}</h1><p>${french ? 'Texte publié' : 'Published text'}</p><a href="https://edayaplus.com/" target="_blank" rel="noopener noreferrer">EDAYA</a>${'<p>EDAYA</p>'.repeat(35)}`, sections: [{ heading: french ? 'Utilisation scolaire' : 'School use', paragraphs: [french ? 'Lisez ces conditions avant de les accepter.' : 'Read these terms before accepting.', ...Array.from({ length: 12 }, (_, index) => french ? `Section ${index + 1} : Utilisez le service scolaire de manière responsable et protégez les informations de votre compte.` : `Section ${index + 1}: Use the school service responsibly and protect your account information.`)] }] } };
				}
				else if (url.pathname.endsWith('/methods')) {
					body = { publicAccountRegistration: true, methods: [] };
				}
				else if (url.pathname.endsWith('/session')) {
					status = 401;
					body = { code: 'reauthentication_required' };
				}
				else if (url.pathname.endsWith('/otp/start')) {
					const input = route.request().postDataJSON() as Record<string, unknown>;
					requests.push(input);
					if ((input.termsAcceptance as { version: string }).version !== version) {
						status = 409;
						body = { code: 'terms_version_changed', message: 'changed' };
					}
					else {
						body = { state: 'primary_required', challenge: 'test-challenge', lifecycle: 'pending', channel: 'email', delivery: 'sent', expiresAt: Date.now() + 300000, nextResendAt: Date.now() + 60000, serverNow: Date.now(), actions: { resend: true, sms: false } };
					}
				}
				await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
			});
			await page.goto(`${base}/login?panel=${panel}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
			await page.getByTestId('language-selector').click();
			await page.getByTestId(`language-option-${locale}`).click();
			const active = page.locator('[data-testid="auth-panel"]:visible');
			const identifier = active.getByTestId('auth-identifier');
			const checkbox = active.getByTestId('auth-terms-accept');
			const submit = active.getByTestId('auth-submit');
			await identifier.fill('person@example.com');
			await checkbox.waitFor();
			assert.equal(await submit.isDisabled(), true);
			assert.equal(await checkbox.isChecked(), false);
			assert.equal(await checkbox.evaluate(input => input.getBoundingClientRect().height <= 24), true, 'text-input sizing must not stretch the checkbox');
			assert.equal(await active.getByTestId('auth-terms-content').isVisible(), false);
			const readTerms = active.getByTestId('auth-terms-read');
			const dialog = page.getByTestId('auth-terms-dialog');
			const confirmTerms = dialog.getByTestId('auth-terms-confirm');
			const formHeight = await active.evaluate(element => element.getBoundingClientRect().height);
			await readTerms.focus();
			await page.keyboard.press('Enter');
			await dialog.waitFor();
			assert.equal(await dialog.getByTestId('auth-terms-content').isVisible(), true);
			assert.equal(await active.evaluate(element => element.getBoundingClientRect().height), formHeight, 'opening terms must not expand the login form');
			assert.equal(await checkbox.isChecked(), false);
			const reader = dialog.frameLocator('iframe');
			await reader.getByText(locale === 'fr' ? 'Texte publié' : 'Published text', { exact: true }).waitFor();
			assert.equal(await reader.getByRole('link').getAttribute('target'), '_blank');
			assert.doesNotMatch(await page.locator('body').innerText(), /Draft preview|Aperçu du projet/);
			await reader.getByRole('link').focus();
			await page.screenshot({ path: `${output}/${panel}-${locale}-default.png`, fullPage: true });
			await page.keyboard.press('Escape');
			await dialog.waitFor({ state: 'hidden' });
			assert.equal(await readTerms.evaluate(element => element === document.activeElement), true);
			assert.equal(await checkbox.isChecked(), false);
			await readTerms.click();
			await dialog.getByTestId('auth-terms-close').click();
			assert.equal(await checkbox.isChecked(), false);
			await page.evaluate(() => {
				document.documentElement.style.fontSize = '200%';
				document.documentElement.classList.add('dark');
			});
			await readTerms.click();
			await confirmTerms.focus();
			await page.keyboard.press('Tab');
			assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true, 'keyboard focus stays in the dialog');
			assert.equal(await confirmTerms.evaluate((element) => {
				const bounds = element.getBoundingClientRect();
				return bounds.top >= 0 && bounds.bottom <= window.innerHeight;
			}), true, 'accept stays reachable with enlarged text');
			await page.screenshot({ path: `${output}/${panel}-${locale}.png`, fullPage: true });
			const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
			assert.equal(overflow, false, 'narrow layout must not scroll horizontally');
			await confirmTerms.click();
			await dialog.waitFor({ state: 'hidden' });
			assert.equal(await checkbox.isChecked(), true);
			assert.equal(await submit.isEnabled(), true);
			assert.equal(requests.length, 0, 'accepting terms must not send a code');
			await readTerms.click();
			await page.keyboard.press('Escape');
			assert.equal(await checkbox.isChecked(), true, 'dismissing preserves prior acceptance');
			await identifier.fill('changed@example.com');
			assert.equal(await checkbox.isChecked(), false);
			await checkbox.check();
			version = 'v2';
			await submit.click();
			await page.waitForFunction(() => document.querySelector('[data-testid="auth-panel"]:not([hidden]) [role="alert"]')?.textContent);
			await page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLInputElement>('[data-testid="auth-terms-accept"]')).filter(input => input.getClientRects().length).every(input => !input.checked));
			await checkbox.check();
			await submit.click();
			await active.getByTestId('auth-code').waitFor();
			assert.deepEqual(requests.at(-1)?.termsAcceptance, { version: 'v2', locale, accepted: true });
			await active.getByTestId('auth-change-contact').click();
			assert.equal(await checkbox.isChecked(), false);
			failTerms = true;
			await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
			assert.equal(await active.getByTestId('auth-submit').isDisabled(), true);
			const retry = active.getByTestId('auth-terms').getByRole('button');
			await retry.waitFor();
			failTerms = false;
			await retry.click();
			await checkbox.waitFor();
			assert.equal(await checkbox.isChecked(), false);
			await context.close();
			console.log(`PASS ${panel} ${locale}: keyboard dialog, dismissal without consent, popup acceptance checks the box, 200% mobile layout with dark preference, identity reset, version refresh, OTP and loading retry`);
		}
	}
	assert.deepEqual(errors, []);
	const fingerprint = createHash('sha256');
	for (const file of ['src/app.css', 'src/lib/components/auth/TermsAcceptance.svelte', 'src/lib/components/auth/terms-reader.ts', 'src/lib/smart-components/passwordless-panel/PasswordlessPanel.svelte', 'src/lib/smart-components/passwordless-panel/passwordless-panel-state.svelte.ts', 'src/lib/auth/client.ts']) fingerprint.update(await readFile(file));
	await writeFile(`${output}/evidence.json`, JSON.stringify({ sourceFingerprint: fingerprint.digest('hex'), localMockApi: true, viewport: [390, 844], textScale: ['100%', '200%'], colorPreference: 'dark', applicationPalette: 'default', locales: ['en', 'fr'], panels: ['signin', 'signup'], result: '4 scenarios passed' }, null, 2));
}
finally { await browser.close(); }
