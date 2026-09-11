import type { Page } from 'playwright';
import type { DemoContext, SignInOptions } from './types';
import path from 'node:path';
import { TEACHER_PORTAL_GATE_BANNER_TEST_ID } from '$lib/auth/teacher-portal-gate';
import { DEMO_PASSWORD, STAFF_EMAIL } from './constants';
import { integrationUsesDemoLogin, webappReadinessPath } from './paths';

export async function waitForEnabled(locator: ReturnType<Page['locator']>, timeout = 30_000): Promise<void> {
	await locator.waitFor({ state: 'visible', timeout });
	await locator.evaluate(async (element) => {
		const input = element as HTMLInputElement | HTMLButtonElement;
		const started = Date.now();
		while (input.disabled && Date.now() - started < 25_000) {
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		if (input.disabled) {
			throw new Error('Timed out waiting for control to become enabled');
		}
	});
}

export async function ensurePasswordSignInPanel(page: Page): Promise<void> {
	const emailInput = page.locator('#login-password-email');
	const alreadyVisible = await emailInput.waitFor({ state: 'visible', timeout: 2_000 }).then(() => true).catch(() => false);
	if (alreadyVisible) {
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

	await emailInput.waitFor({ state: 'visible', timeout: 15_000 });
}

/** Password login via UI; returns false if redirect after submit does not occur. */
export async function attemptPasswordSignIn(
	page: Page,
	base: string,
	email: string,
	password: string,
): Promise<boolean> {
	try {
		// Canonical query avoids afterNavigate remounting the form after fill.
		await page.goto(`${base}/login?panel=signin&method=password&stage=form`, {
			waitUntil: 'domcontentloaded',
		});
		await ensurePasswordSignInPanel(page);

		const emailInput = page.locator('#login-password-email');
		const passwordInput = page.locator('#login-password');
		const submit = page
			.locator('form')
			.filter({ has: page.locator('#login-password-email') })
			.getByRole('button', { name: /sign in|se connecter/i });
		await waitForEnabled(emailInput);
		await waitForEnabled(passwordInput);

		await emailInput.fill(email);
		await passwordInput.fill(password);
		await waitForEnabled(submit);
		await submit.click();

		const appShellUrl = page.waitForURL(
			/\/(dashboard|school|classes|configuration|onboarding|finance)/,
			{ timeout: 30_000 },
		);
		const teacherGateBanner = page.waitForSelector(
			`[data-testid="${TEACHER_PORTAL_GATE_BANNER_TEST_ID}"]`,
			{ timeout: 30_000 },
		);
		await Promise.race([appShellUrl, teacherGateBanner]);
		return true;
	}
	catch {
		return false;
	}
}

/** Sign in via the auth API (bypasses UI post-auth redirects e.g. teacher → /login). */
export async function attemptApiSignIn(
	page: Page,
	base: string,
	email: string,
	password: string,
): Promise<boolean> {
	try {
		const response = await page.request.post(`${base}/auth/sign-in/email`, {
			headers: { 'content-type': 'application/json' },
			data: { email, password },
		});
		if (!response.ok()) {
			return false;
		}

		await page.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded' });
		await page.waitForURL(/\/(dashboard|school|classes|configuration|onboarding|finance)/, { timeout: 30_000 });
		return true;
	}
	catch {
		return false;
	}
}

async function signInWithPassword(
	page: Page,
	base: string,
	email: string,
	password: string = DEMO_PASSWORD,
): Promise<void> {
	const ok = await attemptPasswordSignIn(page, base, email, password);
	if (!ok) {
		throw new Error(`Password sign-in failed for ${email}`);
	}
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
	const {
		namePattern = /Jean-Baptiste Aka|Aka/i,
		email = STAFF_EMAIL,
		password = DEMO_PASSWORD,
	} = account;
	const { page, base } = ctx;

	if (!integrationUsesDemoLogin()) {
		await signInWithPassword(page, base, email, password);
	}
	else {
		const usedDemoPicker = await signInWithDemoPicker(page, base, namePattern);
		if (!usedDemoPicker) {
			await signInWithPassword(page, base, email, password);
		}
	}
	await page.waitForURL(/\/(dashboard|school|classes|onboarding|configuration|finance)/, { timeout: 30_000 });
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
			? 'Use WEBAPP_URL=https://staging.app.school.edayaplus.com for remote staging, or start bun dev locally.'
			: 'Use WEBAPP_URL=https://app.school.edayaplus.com for remote production.';
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
