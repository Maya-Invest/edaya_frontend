import type { Page } from 'playwright';
import { attemptPasswordSignIn, waitForEnabled } from '../../demo-dry-run/support/auth';
import { resolveAuthUrl } from '../../support/integration-hosts';
import { currentOnboardingStep, loginSignupPath } from './paths';

const SEED_AUTH_PROVISION_HEADER = 'x-edaya-seed-provision';
const SIGNUP_SUBMIT = /créer mon compte|create my account|création du compte|creating account/i;
const VERIFICATION_COPY = /vérifiez votre boîte mail|check your inbox/i;

async function markEmailVerified(email: string, origin: string): Promise<void> {
	const authUrl = resolveAuthUrl();
	const response = await fetch(`${authUrl}/dev/seed/mark-email-verified`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			origin,
			[SEED_AUTH_PROVISION_HEADER]: '1',
		},
		body: JSON.stringify({ email }),
	});
	if (response.ok || response.status === 404) {
		return;
	}
	throw new Error(`mark-email-verified failed: ${response.status} ${await response.text()}`);
}

export async function assertStackReady(base: string): Promise<void> {
	const readinessPath = process.env.WEBAPP_READINESS_PATH ?? '/login';
	try {
		const res = await fetch(`${base}${readinessPath}`, { signal: AbortSignal.timeout(15_000) });
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}`);
		}
	}
	catch (err) {
		const detail = err instanceof Error ? err.message : String(err);
		throw new Error(
			`Webapp not ready at ${base}${readinessPath} (${detail}). Start bun dev or Wrangler preview:integration.`,
		);
	}
}

export async function signUpThroughUi(
	page: Page,
	base: string,
	options: { name: string; email: string; password: string },
): Promise<void> {
	await page.goto(loginSignupPath(base), { waitUntil: 'domcontentloaded' });

	const nameInput = page.locator('#signup-name');
	await nameInput.waitFor({ state: 'visible', timeout: 20_000 });
	const emailInput = page.locator('#signup-email');
	const passwordInput = page.locator('#signup-password');
	const confirmInput = page.locator('#signup-confirm-password');
	const submit = page.locator('form').filter({ has: nameInput }).getByRole('button', { name: SIGNUP_SUBMIT });

	await waitForEnabled(nameInput);
	await waitForEnabled(emailInput);
	await waitForEnabled(passwordInput);
	await waitForEnabled(confirmInput);
	await nameInput.fill(options.name);
	await emailInput.fill(options.email);
	await passwordInput.fill(options.password);
	await confirmInput.fill(options.password);
	await waitForEnabled(submit);
	await submit.click();

	const reachedOnboarding = page.waitForURL(/\/onboarding/, { timeout: 30_000 }).then(() => 'onboarding' as const);
	const verification = page.getByText(VERIFICATION_COPY).waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'verification' as const);
	const outcome = await Promise.race([reachedOnboarding, verification]).catch(() => 'timeout' as const);

	if (outcome === 'onboarding') {
		await page.locator('#onboarding-school-name').waitFor({ state: 'visible', timeout: 20_000 });
		return;
	}

	if (outcome === 'verification') {
		await markEmailVerified(options.email, base);
		const signedIn = await attemptPasswordSignIn(page, base, options.email, options.password);
		if (!signedIn) {
			throw new Error(`Password sign-in after email verification failed for ${options.email}`);
		}
		await page.waitForURL(/\/onboarding/, { timeout: 30_000 });
		await page.locator('#onboarding-school-name').waitFor({ state: 'visible', timeout: 20_000 });
		return;
	}

	const alertText = await page.locator('[role="alert"]').allInnerTexts().catch(() => []);
	throw new Error(
		`Signup did not reach onboarding for ${options.email}. url=${page.url()} alerts=${alertText.join(' | ')}`,
	);
}

export async function expectOnboardingStep(page: Page, step: number): Promise<void> {
	await page.waitForURL((url) => {
		return url.pathname.replace(/\/+$/, '') === '/onboarding' && currentOnboardingStep(url.href) === step;
	}, { timeout: 20_000 });
}
