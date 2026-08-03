import type { Page } from 'playwright';
import type { DemoContext, SignInOptions } from './types';
import path from 'node:path';
import { DEMO_PASSWORD, STAFF_EMAIL } from './constants';
import { integrationUsesDemoLogin, webappReadinessPath } from './paths';

async function waitForEnabled(locator: ReturnType<Page['locator']>, timeout = 30_000): Promise<void> {
	await locator.waitFor({ state: 'visible', timeout });
	await locator.evaluate(async (element) => {
		const input = element as HTMLInputElement | HTMLButtonElement;
		const started = Date.now();
		while (input.disabled && Date.now() - started < 25_000) {
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		if (input.disabled) {
			throw new Error('Timed out waiting for login control to become enabled (API may be unreachable)');
		}
	});
}

async function ensurePasswordSignInPanel(page: Page): Promise<void> {
	const emailInput = page.locator('#login-password-email');
	if (await emailInput.isVisible().catch(() => false)) {
		return;
	}

	const signInTab = page.getByRole('button', { name: /sign in|connexion|se connecter/i }).first();
	if (await signInTab.isVisible().catch(() => false)) {
		await signInTab.click();
	}

	const passwordMethod = page.getByRole('tab', { name: /password|mot de passe/i });
	if (await passwordMethod.isVisible().catch(() => false)) {
		await passwordMethod.click();
	}

	await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
}

async function signInWithPassword(
	page: Page,
	base: string,
	email: string,
): Promise<void> {
	await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
	await ensurePasswordSignInPanel(page);

	const emailInput = page.locator('#login-password-email');
	const passwordInput = page.locator('#login-password');
	await waitForEnabled(emailInput);
	await waitForEnabled(passwordInput);

	await emailInput.fill(email);
	await passwordInput.fill(DEMO_PASSWORD);
	await page
		.locator('form')
		.filter({ has: page.locator('#login-password-email') })
		.getByRole('button', { name: /sign in|se connecter/i })
		.click();
}

async function signInWithDemoPicker(
	page: Page,
	base: string,
	namePattern: RegExp,
): Promise<boolean> {
	await page.goto(`${base}/login/demo`, { waitUntil: 'domcontentloaded' });

	const demoBtn = page.getByRole('button', { name: namePattern });
	const apiBanner = page.getByText(/API (locale )?indisponible|API unreachable|Local API unreachable/i);

	// Do not race the banner — it flashes while /auth/get-session is in flight.
	const hasBtn = await demoBtn.waitFor({ timeout: 30_000 }).then(() => true).catch(() => false);
	if (hasBtn) {
		await waitForEnabled(demoBtn);
		await demoBtn.click();
		return true;
	}

	if (await apiBanner.isVisible().catch(() => false)) {
		throw new Error(
			'Demo login page reports API unavailable after waiting for accounts. Start the API (`cd ../edaya_backend && bun repo dev`) and confirm /auth/get-session responds.',
		);
	}

	return false;
}

export async function signIn(ctx: DemoContext, account: SignInOptions = {}): Promise<void> {
	const { namePattern = /Jean-Baptiste Aka|Aka/i, email = STAFF_EMAIL } = account;
	const { page, base } = ctx;

	if (!integrationUsesDemoLogin()) {
		await signInWithPassword(page, base, email);
	}
	else {
		const usedDemoPicker = await signInWithDemoPicker(page, base, namePattern);
		if (!usedDemoPicker) {
			await signInWithPassword(page, base, email);
		}
	}
	await page.waitForURL(/\/(dashboard|school|classes)/, { timeout: 30_000 });
	await page.waitForSelector('aside#app-sidebar', { timeout: 20_000 });
}

export async function assertStackReady(base: string): Promise<void> {
	const readinessPath = webappReadinessPath();
	try {
		const res = await fetch(`${base}${readinessPath}`, { signal: AbortSignal.timeout(15_000) });
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}`);
		}
	}
	catch (err) {
		const detail = err instanceof Error ? err.message : String(err);
		const hint = integrationUsesDemoLogin()
			? 'Use WEBAPP_URL=https://staging.app.edayaplus.com for remote staging, or start bun dev locally.'
			: 'Use WEBAPP_URL=https://app.edayaplus.com for remote production.';
		throw new Error(`Webapp not ready at ${base}${readinessPath} (${detail}). ${hint}`);
	}
}

export function createShot(page: Page, outDir: string) {
	return async (name: string) => {
		await page.screenshot({
			path: path.join(outDir, `${name}.png`),
			fullPage: true,
		});
	};
}
