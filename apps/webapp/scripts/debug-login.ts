#!/usr/bin/env bun
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { provisionTenant } from '../tests/integration/support/api-provision';

const FIXTURE = path.join(import.meta.dirname, '..', '.integration-run', 'fixture.json');

async function main(): Promise<void> {
	let email: string;
	let password: string;

	try {
		const fixture = JSON.parse(await readFile(FIXTURE, 'utf8')) as { email: string; password: string };
		email = fixture.email;
		password = fixture.password;
		console.log('Using fixture:', email);
	}
	catch {
		const tenant = await provisionTenant();
		email = tenant.email;
		password = tenant.password;
		console.log('Provisioned:', email);
	}

	const r1 = await fetch('http://localhost:9999/auth/sign-in/email', {
		method: 'POST',
		headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
		body: JSON.stringify({ email, password }),
	});
	console.log('API sign-in:', r1.status, (await r1.text()).slice(0, 200));

	const r2 = await fetch('http://localhost:5173/auth/get-session');
	console.log('get-session via proxy:', r2.status);

	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
	await page.waitForTimeout(3_000);

	const emailVisible = await page.locator('#login-password-email').isVisible().catch(() => false);
	const emailEnabled = await page.locator('#login-password-email').isEnabled().catch(() => false);
	const apiBanner = await page.getByText(/API|indisponible|unreachable/i).first().textContent().catch(() => null);
	const bodyText = await page.locator('body').innerText().catch(() => '');

	console.log('email input visible:', emailVisible);
	console.log('email input enabled:', emailEnabled);
	console.log('api banner:', apiBanner?.slice(0, 80) ?? 'none');
	console.log('url:', page.url());

	if (!emailVisible) {
		const signInTab = page.getByRole('button', { name: /sign in|connexion|se connecter/i }).first();
		if (await signInTab.isVisible().catch(() => false)) {
			console.log('clicking sign-in tab');
			await signInTab.click();
		}
		const passwordTab = page.getByRole('tab', { name: /password|mot de passe/i });
		if (await passwordTab.isVisible().catch(() => false)) {
			console.log('clicking password tab');
			await passwordTab.click();
		}
	}

	const emailInput = page.locator('#login-password-email');
	await emailInput.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {
		console.log('TIMEOUT waiting for #login-password-email');
	});
	console.log('after tabs - visible:', await emailInput.isVisible().catch(() => false));
	console.log('after tabs - enabled:', await emailInput.isEnabled().catch(() => false));

	if (await emailInput.isVisible().catch(() => false)) {
		await emailInput.fill(email);
		await page.locator('#login-password').fill(password);
		await page
			.locator('form')
			.filter({ has: page.locator('#login-password-email') })
			.getByRole('button', { name: /sign in|se connecter/i })
			.click();
		await page.waitForTimeout(5_000);
		console.log('after submit url:', page.url());
		const toast = await page.locator('[data-sonner-toast], [role="status"]').first().textContent().catch(() => null);
		console.log('toast/status:', toast?.slice(0, 120) ?? 'none');
	}

	await page.screenshot({ path: '.integration-run/debug-login.png', fullPage: true });
	console.log('screenshot: .integration-run/debug-login.png');
	console.log('body snippet:', bodyText.slice(0, 400).replace(/\s+/g, ' '));

	await browser.close();
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
