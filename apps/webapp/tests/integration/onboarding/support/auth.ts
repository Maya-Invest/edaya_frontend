import type { Page } from 'playwright';
import { waitForEnabled } from '../../demo-dry-run/support/auth';
import { resolveAuthUrl } from '../../support/integration-hosts';
import { currentOnboardingStep, loginSignInPath, loginSignupPath } from './paths';

const SEED_AUTH_PROVISION_HEADER = 'x-edaya-seed-provision';
const SIGNUP_SUBMIT = /créer mon compte|create my account|création du compte|creating account/i;
const SIGN_IN_SUBMIT = /sign in|se connecter/i;
const VERIFICATION_COPY = /vérifiez votre boîte mail|check your inbox/i;
const SWITCH_TO_SIGNUP = /create account|créer un compte/i;
const SIGN_OUT = /sign out|se déconnecter/i;

export { waitForEnabled };

export async function markEmailVerified(email: string, origin: string): Promise<void> {
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

export function signupSubmitButton(page: Page) {
	return page.locator('form').filter({ has: page.locator('#signup-name') }).getByRole('button', { name: SIGNUP_SUBMIT });
}

export function passwordSignInSubmit(page: Page) {
	return page
		.locator('form')
		.filter({ has: page.locator('#login-password-email') })
		.getByRole('button', { name: SIGN_IN_SUBMIT });
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

	const passwordMethod = page.getByRole('button', { name: /password|mot de passe/i }).first();
	if (await passwordMethod.isVisible().catch(() => false)) {
		await passwordMethod.click();
	}

	await emailInput.waitFor({ state: 'visible', timeout: 15_000 });
}

export async function openSignupPanel(page: Page, base: string): Promise<void> {
	await page.goto(loginSignInPath(base), { waitUntil: 'domcontentloaded' });
	await ensurePasswordSignInPanel(page);
	const switchToSignup = page.getByRole('button', { name: SWITCH_TO_SIGNUP }).first();
	await switchToSignup.waitFor({ state: 'visible', timeout: 15_000 });
	await switchToSignup.click();
	await page.locator('#signup-name').waitFor({ state: 'visible', timeout: 15_000 });
}

export async function signInWithPassword(
	page: Page,
	base: string,
	email: string,
	password: string,
): Promise<void> {
	await page.goto(loginSignInPath(base), { waitUntil: 'domcontentloaded' });
	await ensurePasswordSignInPanel(page);

	const emailInput = page.locator('#login-password-email');
	const passwordInput = page.locator('#login-password');
	const submit = passwordSignInSubmit(page);
	await waitForEnabled(emailInput);
	await waitForEnabled(passwordInput);
	await emailInput.fill(email);
	await passwordInput.fill(password);
	await waitForEnabled(submit);
	await submit.click();

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
	options: { name: string; email: string; password: string },
): Promise<void> {
	await page.goto(loginSignupPath(base), { waitUntil: 'domcontentloaded' });

	const nameInput = page.locator('#signup-name');
	await nameInput.waitFor({ state: 'visible', timeout: 20_000 });
	const emailInput = page.locator('#signup-email');
	const passwordInput = page.locator('#signup-password');
	const confirmInput = page.locator('#signup-confirm-password');
	const submit = signupSubmitButton(page);

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
		await signInWithPassword(page, base, options.email, options.password);
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
