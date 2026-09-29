import type { Page } from 'playwright';
import { waitForEnabled } from '../../demo-dry-run/support/auth';
import { resolveApiUrl, resolveAuthUrl } from '../../support/integration-hosts';
import { sendOtpThroughUi, verifyOtpThroughUi } from '../../support/passwordless';
import { currentOnboardingStep, loginSignInPath, loginSignupPath } from './paths';

const SIGN_OUT = /sign out|se déconnecter/i;
export { waitForEnabled };

export async function assertStackReady(base: string): Promise<void> {
	const readinessPath = process.env.WEBAPP_READINESS_PATH ?? '/login';
	await assertHttpReady(`${base}${readinessPath}`, `Webapp not ready at ${base}${readinessPath}. Start bun dev or Wrangler preview:integration.`);
	const authUrl = resolveAuthUrl();
	await assertHttpReady(`${authUrl}/auth/edaya/methods`, `Identity not ready at ${authUrl}/auth/edaya/methods.`);
	const apiUrl = resolveApiUrl();
	await assertHttpReady(`${apiUrl}/reference`, `School API not ready at ${apiUrl}/reference.`);
}

async function assertHttpReady(url: string, message: string): Promise<void> {
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}`);
		}
	}
	catch (err) {
		const detail = err instanceof Error ? err.message : String(err);
		throw new Error(`${message} (${detail})`);
	}
}

export async function signInWithPassword(page: Page, base: string, email: string, _password: string): Promise<void> {
  await page.goto(loginSignInPath(base), { waitUntil: 'domcontentloaded' });
  await sendOtpThroughUi(page, email);
  await verifyOtpThroughUi(page, email);
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30_000 });
}

export async function signOutFromOnboarding(page: Page): Promise<void> {
	const button = page.getByRole('button', { name: SIGN_OUT }).first();
	await button.waitFor({ state: 'visible', timeout: 15_000 });
	await button.click();
	await page.waitForURL(/\/login/, { timeout: 20_000 });
}

export async function expectAppDashboard(page: Page): Promise<void> {
	await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
	const chrome = page.locator('aside#app-sidebar, [data-testid="user-menu"]').first();
	try {
		await chrome.waitFor({ state: 'visible', timeout: 30_000 });
	}
	catch {
		const pending = await page.getByTestId('app-shell-pending').isVisible().catch(() => false);
		const body = await page.locator('body').innerText().catch(() => '');
		throw new Error(
			`Staff app chrome missing: ${page.url()} pending=${pending} body=${body.slice(0, 800)}`,
		);
	}
	if (page.url().includes('/onboarding') || page.url().includes('/invite/') || page.url().includes('/login')) {
		throw new Error(`Expected dashboard, landed on ${page.url()}`);
	}
}

export async function signUpThroughUi(
	page: Page,
	base: string,
	options: { name: string; email: string; password: string; verifyInNewPage?: boolean },
): Promise<Page> {
  await page.goto(loginSignupPath(base), { waitUntil: 'domcontentloaded' });
  await sendOtpThroughUi(page, options.email);
  if (page.url().includes('/onboarding')) throw new Error('Account creation skipped OTP proof');
  await verifyOtpThroughUi(page, options.email);
  await page.waitForURL(/\/onboarding/, { timeout: 30_000 });
  if (options.verifyInNewPage) {
    const next = await page.context().newPage();
    await next.goto(`${base}/onboarding`, { waitUntil: 'domcontentloaded' });
    await expectOnboardingStep(next, 1);
    return next;
  }
  return page;
}

export async function expectOnboardingStep(page: Page, step: number): Promise<void> {
	const deadline = Date.now() + 20_000;
	while (Date.now() < deadline) {
		const current = currentOnboardingStep(page.url());
		if (current === step) {
			return;
		}
		await page.waitForTimeout(150);
	}
	throw new Error(`Expected onboarding step ${step}, got ${page.url()}`);
}
