import type { Page } from 'playwright';
import {
	fillPersonCreateDialogWithInvite,
	openDialogButton,
	waitForPageQuery,
} from '../../../../scripts/qa-harness-ui';
import { waitForInvitationToken } from '../../setup/journey-context';
import {
	expectAppDashboard,
	followVerificationLink,
	markEmailVerified,
	signInWithPassword,
	waitForEnabled,
} from './auth';
import { invitePath, stripTrailingSlash } from './paths';

const ACCEPT_INVITE = /accepter l['’]invitation|accept invitation/i;
const VERIFICATION_COPY = /vérifiez votre boîte mail|check your inbox/i;
const SWITCH_TO_SIGN_IN = /sign in|se connecter/i;
const SEND_OR_RESEND = /send invitation|envoyer une invitation|resend|renvoyer/i;
const INVALID_INVITE = /not valid|n'est pas valide|not found|introuvable|expired|expiré|revoked|révoqué|replaced|remplacée/i;
const ADD_STAFF = /add staff member|ajouter un membre/i;

async function finishInviteAfterVerification(
	page: Page,
	base: string,
	options: { email: string; password: string },
): Promise<void> {
	const followed = await followVerificationLink(page, options.email, /\/dashboard/);
	if (followed) {
		await expectAppDashboard(page);
		return;
	}

	await markEmailVerified(options.email, base);
	const switchToSignIn = page.getByRole('button', { name: SWITCH_TO_SIGN_IN }).first();
	if (await switchToSignIn.isVisible().catch(() => false)) {
		await switchToSignIn.click();
	}
	const retryPassword = page.locator('input[type="password"]').first();
	if (await retryPassword.isVisible().catch(() => false)) {
		await retryPassword.fill(options.password);
		const retryAccept = page.getByRole('button', { name: ACCEPT_INVITE });
		await waitForEnabled(retryAccept);
		await retryAccept.evaluate((element) => {
			(element as HTMLButtonElement).click();
		});
	}
	else {
		await signInWithPassword(page, base, options.email, options.password);
	}
	await expectAppDashboard(page);
}

function tokenFromInviteUrl(value: string): string | null {
	try {
		const parsed = new URL(value, 'http://local.invalid');
		const match = parsed.pathname.match(/\/invite\/([^/?#]+)/);
		return match?.[1] ? decodeURIComponent(match[1]) : null;
	}
	catch {
		return null;
	}
}

export async function assertInvalidInvitePage(page: Page, base: string): Promise<void> {
	await page.goto(invitePath(base, 'qa-invalid-token'), { waitUntil: 'domcontentloaded' });
	await page.locator('.animate-spin').first().waitFor({ state: 'detached', timeout: 15_000 }).catch(() => undefined);
	const heading = page.getByRole('heading', { name: INVALID_INVITE }).first();
	await heading.waitFor({ state: 'visible', timeout: 15_000 });
	if (page.url().includes('/onboarding') || page.url().includes('/dashboard')) {
		throw new Error(`Invalid invite redirected into the app: ${page.url()}`);
	}
}

async function readDisplayedInviteToken(page: Page): Promise<string | null> {
	const inputs = page.locator('input[readonly]');
	const count = await inputs.count();
	for (let index = 0; index < count; index += 1) {
		const value = await inputs.nth(index).inputValue().catch(() => '');
		const token = tokenFromInviteUrl(value);
		if (token) {
			return token;
		}
	}
	return null;
}

export async function inviteStaffFromOwnerPage(
	page: Page,
	base: string,
	email: string,
): Promise<string> {
	await page.goto(`${stripTrailingSlash(base)}/school/staff`, { waitUntil: 'domcontentloaded' });
	await page.locator('aside#app-sidebar').waitFor({ state: 'visible', timeout: 30_000 });
	await waitForPageQuery(page);

	const opened = await openDialogButton(page, ADD_STAFF, 20_000);
	if (!opened) {
		throw new Error('Could not open staff create dialog');
	}

	await fillPersonCreateDialogWithInvite(page, {
		email,
		firstName: 'Invited',
		lastName: 'Staff',
	});

	await page.waitForURL(/\/school\/staff\/[^/?]+/, { timeout: 30_000 });
	await waitForPageQuery(page);

	const sendOrResend = page.getByRole('button', { name: SEND_OR_RESEND }).first();
	await sendOrResend.waitFor({ state: 'visible', timeout: 20_000 });
	const tokenPromise = waitForInvitationToken(page, 25_000);
	await waitForEnabled(sendOrResend);
	await sendOrResend.click();
	const token = await tokenPromise.catch(() => null);
	if (token) {
		return token;
	}
	await page.waitForFunction(() => {
		return [...document.querySelectorAll('input')].some(element =>
			element instanceof HTMLInputElement && element.readOnly && element.value.includes('/invite/'));
	}, { timeout: 10_000 }).catch(() => undefined);
	const displayed = await readDisplayedInviteToken(page);
	if (!displayed) {
		throw new Error(`Staff invite token was not returned for ${email}`);
	}
	return displayed;
}

export async function acceptStaffInviteThroughUi(
	page: Page,
	base: string,
	options: { token: string; name: string; email: string; password: string },
): Promise<void> {
	await page.goto(invitePath(base, options.token), { waitUntil: 'domcontentloaded' });
	const accept = page.getByRole('button', { name: ACCEPT_INVITE });
	await accept.waitFor({ state: 'visible', timeout: 20_000 });

	await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 20_000 });

	const nameInput = page.locator('input[autocomplete="name"]');
	if (await nameInput.isVisible().catch(() => false)) {
		await nameInput.fill(options.name);
		await nameInput.blur();
	}
	const emailInput = page.locator('input[type="email"]').first();
	if (await emailInput.isEditable().catch(() => false)) {
		await emailInput.fill(options.email);
		await emailInput.blur();
	}
	const passwordInput = page.locator('input[type="password"]').first();
	await passwordInput.fill(options.password);
	await passwordInput.blur();

	await waitForEnabled(accept);

	const pageErrors: string[] = [];
	page.on('pageerror', error => pageErrors.push(error.message));
	page.on('console', message => {
		if (message.type() === 'error') {
			pageErrors.push(message.text());
		}
	});
	page.on('response', (response) => {
		if (response.status() < 400) {
			return;
		}
		const url = response.url();
		if (!/:(9900|9999)\//.test(url) && !url.includes('/auth/') && !url.includes('/public/') && !url.includes('/core/')) {
			return;
		}
		pageErrors.push(`${response.status()} ${url}`);
	});

	const toastVisible = page.locator('[role="status"] p').first().waitFor({
		state: 'visible',
		timeout: 15_000,
	}).then(async () => 'toast' as const);

	await accept.evaluate((element) => {
		(element as HTMLButtonElement).click();
	});

	const dashboard = page.waitForURL(/\/dashboard/, { timeout: 30_000 }).then(() => 'dashboard' as const);
	const verification = page.getByText(VERIFICATION_COPY).waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'verification' as const);
	const linking = page.getByText(/liaison|linking/i).waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'linking' as const);
	const outcome = await Promise.race([dashboard, verification, toastVisible, linking]).catch(() => 'timeout' as const);

	if (outcome === 'toast') {
		const alerts = await page.locator('[role="status"] p').allInnerTexts().catch(() => []);
		throw new Error(`Invited staff accept failed: ${page.url()} toasts=${alerts.join(' | ')} errors=${pageErrors.join(' | ')}`);
	}

	if (outcome === 'linking') {
		const linked = await Promise.race([dashboard, verification]).catch(() => 'timeout' as const);
		if (linked === 'verification') {
			await finishInviteAfterVerification(page, base, options);
			return;
		}
		if (linked !== 'dashboard' || page.url().includes('/onboarding')) {
			const alerts = await page.locator('[role="alert"], [role="status"]').allInnerTexts().catch(() => []);
			const mainText = await page.locator('main').innerText().catch(() => '');
			throw new Error(
				`Invited staff did not reach dashboard after linking: ${page.url()} alerts=${alerts.join(' | ')} errors=${pageErrors.join(' | ')} body=${mainText.slice(0, 800)}`,
			);
		}
		await expectAppDashboard(page);
		return;
	}

	if (outcome === 'verification') {
		await finishInviteAfterVerification(page, base, options);
		return;
	}

	if (outcome !== 'dashboard' || page.url().includes('/onboarding')) {
		const alerts = await page.locator('[role="alert"], [role="status"]').allInnerTexts().catch(() => []);
		const mainText = await page.locator('main').innerText().catch(() => '');
		throw new Error(
			`Invited staff did not reach dashboard: ${page.url()} outcome=${outcome} alerts=${alerts.join(' | ')} errors=${pageErrors.join(' | ')} body=${mainText.slice(0, 800)}`,
		);
	}
	await expectAppDashboard(page);
}
