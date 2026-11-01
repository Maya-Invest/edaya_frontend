import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ensurePlaywrightChromium } from './playwright-browsers';
import { beginExecution } from '../tests/integration/support/execution-metadata';

const output = resolve(import.meta.dirname, '../.availability-run');
mkdirSync(output, { recursive: true });
const completeExecution = beginExecution(output);

ensurePlaywrightChromium();
const { chromium } = await import('playwright');
const browser = await chromium.launch();
const outcomes: { scenario: string; status: 'passed' | 'failed' }[] = [];
const base = process.env.WEBAPP_URL ?? 'http://127.0.0.1:4173';
try {
	for (const language of ['en', 'fr']) {
		for (const mode of ['disabled', 'failed', 'enabled']) {
			const context = await browser.newContext();
			try {
				await context.addInitScript(lang => localStorage.setItem('lang', lang), language);
				let discovery = 0;
				let starts = 0;
				await context.route('**/auth/edaya/methods', async route => {
					discovery++;
					if (mode === 'failed') await route.abort('failed');
					else await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ methods: [{ kind: 'email', channels: ['email'] }, { kind: 'phone', available: mode === 'enabled' }] }) });
				});
				await context.route('**/auth/edaya/otp/start', async route => {
					starts++;
					await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'fixture_rejection', message: 'Fixture rejected' }) });
				});
				const page = await context.newPage();
				await page.goto(`${base}/login`);
				const panel = page.locator('section[aria-labelledby="signin-title"]').getByTestId('auth-panel');
				const identifier = panel.getByTestId('auth-identifier');
				await identifier.waitFor();
				await page.waitForFunction(() => document.querySelector('[data-testid="auth-identifier"]') !== null);
				const deadline = Date.now() + 5000;
				while (!discovery && Date.now() < deadline) await page.waitForTimeout(20);
				assert(discovery >= 1, 'Availability discovery must run');
				// Wait for the advertised label to settle before checking the controls.
				const expectedLabel = mode === 'enabled' ? (language === 'en' ? 'Email or phone number' : 'E-mail ou numéro de téléphone') : (language === 'en' ? 'Work email' : 'E-mail professionnel');
				await panel.getByText(expectedLabel, { exact: true }).waitFor();
				await identifier.fill('+2250712345678');
				await panel.getByTestId('auth-submit').click();
				if (mode === 'enabled') {
					await panel.getByRole('alert').filter({ hasText: 'Fixture rejected' }).waitFor();
					assert.equal(starts, 1);
				} else {
					await panel.getByRole('alert').filter({ hasText: language === 'en' ? 'Phone verification is temporarily unavailable. Use email.' : 'La vérification par téléphone est temporairement indisponible. Utilisez une adresse e-mail.' }).waitFor();
					assert.equal(starts, 0, 'Pasted phone must be rejected without a request');
					assert.equal(await panel.getByText(/Include \+225|Incluez \+225/).count(), 0);
					await identifier.fill('fixture@example.com');
					await panel.getByTestId('auth-submit').click();
					await panel.getByRole('alert').filter({ hasText: 'Fixture rejected' }).waitFor();
					assert.equal(starts, 1, 'Email authentication must remain available');
				}
				outcomes.push({ scenario: `${language}.${mode}`, status: 'passed' });
			} catch (error) { outcomes.push({ scenario: `${language}.${mode}`, status: 'failed' }); throw error; }
			finally { await context.close(); }
		}
	}
} finally {
	await browser.close();
	writeFileSync(resolve(output, 'summary.json'), JSON.stringify({ outcomes }, null, 2));
}
assert.equal(outcomes.length, 6);
completeExecution();
console.log('Email-only browser availability: 6 scenarios passed');
