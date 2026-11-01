import type { Page } from 'playwright';
import type { DemoContext, SignInOptions } from './types';
import path from 'node:path';
import { sendOtpThroughUi, verifyOtpThroughUi, passwordlessApiLogin } from '../../support/passwordless';
import { TEACHER_PORTAL_GATE_BANNER_TEST_ID } from '$lib/auth/teacher-portal-gate';
import { DEMO_PASSWORD, STAFF_EMAIL } from './constants';
import { resolveApiUrl, resolveAuthUrl } from '../../support/integration-hosts';
import { integrationUsesDemoLogin, isSignedInStaffUrl, webappReadinessPath } from './paths';

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
  await page.locator('[data-testid="auth-identifier"]:visible').waitFor({ state: 'visible', timeout: 15000 });
}

/** Legacy helper name retained for journey callers; authentication always exercises OTP. */
export async function attemptPasswordSignIn(page: Page, base: string, email: string, _password: string): Promise<boolean> {
  try {
    await page.goto(`${base}/login?panel=signin&method=email-otp&stage=form`, { waitUntil: 'domcontentloaded' });
    if (isSignedInStaffUrl(page.url())) return true;
    await sendOtpThroughUi(page, email);
    await verifyOtpThroughUi(page, email);
    await Promise.race([
      page.waitForURL(url => isSignedInStaffUrl(url.toString()), { timeout: 30000 }),
      page.getByTestId(TEACHER_PORTAL_GATE_BANNER_TEST_ID).waitFor({ state: 'visible', timeout: 30000 }),
    ]);
    return true;
  } catch { return false; }
}

export async function attemptApiSignIn(page: Page, base: string, email: string, _password: string): Promise<boolean> {
  try {
    await passwordlessApiLogin(page, base, email);
    await page.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded' });
    return true;
  } catch { return false; }
}

export async function signIn(ctx: DemoContext, account: SignInOptions = {}): Promise<void> {
  const { page, base } = ctx;
  if (!await attemptPasswordSignIn(page, base, account.email ?? STAFF_EMAIL, account.password ?? DEMO_PASSWORD)) throw new Error('OTP sign-in failed');
  await page.waitForURL(/\/(dashboard|school|classes|onboarding|configuration|finance)/, { timeout: 30000 });
  await page.waitForSelector('aside#app-sidebar', { timeout: 20000 });
}

export async function assertStackReady(base: string): Promise<void> {
	const readinessPath = webappReadinessPath();
	await assertHttpReady(
		`${base}${readinessPath}`,
		`Webapp not ready at ${base}${readinessPath}. ${integrationUsesDemoLogin()
			? 'Use WEBAPP_URL=https://staging.app.edayaplus.com for remote staging, or start bun dev locally.'
			: 'Use WEBAPP_URL=https://app.edayaplus.com for remote production.'}`,
	);
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

export function createShot(page: Page, outDir: string) {
	return async (name: string) => {
		await page.screenshot({
			path: path.join(outDir, `${name}.png`),
			fullPage: true,
            mask: [page.locator('input, textarea, [data-testid*="secret"], [data-testid*="recovery"], [data-testid*="otp"], canvas, svg[aria-label*="QR"]')],
		});
	};
}
