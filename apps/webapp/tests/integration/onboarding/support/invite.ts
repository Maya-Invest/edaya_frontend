import type { Browser, Page } from 'playwright';
import process from 'node:process';
import {
	GUARDIAN_PORTAL_GATE_BANNER_TEST_ID,
} from '$lib/auth/guardian-portal-gate';
import {
	TEACHER_PORTAL_GATE_BANNER_TEST_ID,
} from '$lib/auth/teacher-portal-gate';
import {
	fillPersonCreateDialogWithInvite,
	openDialogButton,
	waitForPageQuery,
} from '../../../../scripts/qa-harness-ui';
import { waitForInvitationToken } from '../../setup/journey-context';
import { sendOtpThroughUi, verifyOtpThroughUi } from '../../support/passwordless';
import {
	expectAppDashboard,
	waitForEnabled,
} from './auth';
import { captureFailure } from './capture';
import { invitePath, stripTrailingSlash } from './paths';

const ACCEPT_INVITE = /accepter l['’]invitation|accept invitation/i;
const SEND_OR_RESEND = /send invitation|envoyer une invitation|resend|renvoyer/i;
const INVALID_INVITE = /not valid|n'est pas valide|not found|introuvable|expired|expiré|revoked|révoqué|replaced|remplacée/i;
const ADD_STAFF = /add staff member|ajouter un membre/i;
const ADD_TEACHER = /add teacher|ajouter un enseignant/i;
const ADD_GUARDIAN = /add guardian|ajouter un tuteur/i;
const WRONG_ACCOUNT = /signed in with another account|connecté avec un autre compte|this account does not match the invitation|ce compte ne correspond pas à l’invitation|contact.*match|contact.*correspond/i;
const REVOKED_INVITE = /invitation was replaced|invitation a été remplacée/i;
const ALREADY_ACCEPTED = /already used|déjà été utilisée|linked to another account|liée à un autre compte/i;
const TEACHER_LINKED = /teacher account linked|compte enseignant relié/i;
const GUARDIAN_LINKED = /guardian account linked|compte tuteur relié/i;

export type InviteAcceptKind = 'staff' | 'teacher' | 'guardian';

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

export async function assertExpiredInvitePage(page: Page, base: string): Promise<void> {
	await page.route('**/public/invitations/**', async (route) => {
		if (route.request().method() !== 'GET' || route.request().url().includes('/accept')) {
			await route.continue();
			return;
		}
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				status: 'expired',
				kind: 'staff',
				targetId: 'expired-target',
				expiresAt: new Date(Date.now() - 60_000).toISOString(),
				schoolName: 'Expired Invite School',
				inviteeName: 'Expired Staff',
				contactChannel: 'email',
				contactEmail: 'expired-staff@integration.edaya.test',
				authAccountExists: false,
			}),
		});
	});
	try {
		await page.goto(invitePath(base, 'qa-expired-token'), { waitUntil: 'domcontentloaded' });
		await page.locator('.animate-spin').first().waitFor({ state: 'detached', timeout: 15_000 }).catch(() => undefined);
		await page.getByRole('heading', { name: /expired|expiré/i }).first().waitFor({ state: 'visible', timeout: 15_000 });
		if (page.url().includes('/onboarding') || page.url().includes('/dashboard')) {
			throw new Error(`Expired invite redirected into the app: ${page.url()}`);
		}
	}
	finally {
		await page.unroute('**/public/invitations/**');
	}
}

export async function readDisplayedInviteToken(page: Page): Promise<string | null> {
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

async function sendOrReadInvitationToken(page: Page): Promise<string> {
	const displayed = await readDisplayedInviteToken(page);
	if (displayed) {
		return displayed;
	}

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
	const afterClick = await readDisplayedInviteToken(page);
	if (!afterClick) {
		throw new Error('Invitation token was not returned');
	}
	return afterClick;
}

export async function resendInvitationFromProfile(page: Page): Promise<{ previousToken: string | null; token: string }> {
	await waitForPageQuery(page);
	const previousToken = await readDisplayedInviteToken(page);
	const sendOrResend = page.getByRole('button', { name: SEND_OR_RESEND }).first();
	await sendOrResend.waitFor({ state: 'visible', timeout: 20_000 });
	const tokenPromise = waitForInvitationToken(page, 25_000);
	await waitForEnabled(sendOrResend);
	await sendOrResend.click();
	const token = await tokenPromise.catch(() => null)
		?? await readDisplayedInviteToken(page);
	if (!token) {
		throw new Error('Resend did not return an invitation token');
	}
	return { previousToken, token };
}

async function invitePersonFromOwnerPage(
	page: Page,
	base: string,
	options: {
		listPath: string;
		idPattern: RegExp;
		openPattern: RegExp;
		email: string;
		firstName: string;
		lastName: string;
	},
): Promise<string> {
	await page.goto(`${stripTrailingSlash(base)}${options.listPath}`, { waitUntil: 'domcontentloaded' });
	await page.locator('aside#app-sidebar').waitFor({ state: 'visible', timeout: 30_000 });
	await waitForPageQuery(page);

	const opened = await openDialogButton(page, options.openPattern, 20_000);
	if (!opened) {
		throw new Error(`Could not open create dialog on ${options.listPath}`);
	}

	const commands: Record<string, string> = {
		'/school/staff': 'register-staff',
		'/school/teachers': 'register-teacher',
		'/school/guardians': 'register-guardian',
	};
	const command = commands[options.listPath];
	if (!command)
		throw new Error(`Unregistered invitation fixture: ${options.listPath}`);
	const creation = page.waitForResponse(response => response.request().method() === 'POST'
		&& response.url().includes(`/core/commands/${command}`), { timeout: 25000 });
	await fillPersonCreateDialogWithInvite(page, {
		email: options.email,
		firstName: options.firstName,
		lastName: options.lastName,
	});
	const created = await creation;
	if (!created.ok())
		throw new Error(`${command} failed: HTTP ${created.status()}`);
	await page.waitForURL(options.idPattern, { timeout: 30000 });
	await page.locator('aside[aria-label]').waitFor({ state: 'visible', timeout: 15000 });
	return sendOrReadInvitationToken(page);
}

export async function inviteStaffFromOwnerPage(
	page: Page,
	base: string,
	email: string,
): Promise<string> {
	return invitePersonFromOwnerPage(page, base, {
		listPath: '/school/staff',
		idPattern: /\/school\/staff\/[^/?]+/,
		openPattern: ADD_STAFF,
		email,
		firstName: 'Invited',
		lastName: 'Staff',
	});
}

export async function inviteTeacherFromOwnerPage(
	page: Page,
	base: string,
	email: string,
): Promise<string> {
	return invitePersonFromOwnerPage(page, base, {
		listPath: '/school/teachers',
		idPattern: /\/school\/teachers\/[^/?]+/,
		openPattern: ADD_TEACHER,
		email,
		firstName: 'Invited',
		lastName: 'Teacher',
	});
}

export async function inviteGuardianFromOwnerPage(
	page: Page,
	base: string,
	email: string,
): Promise<string> {
	return invitePersonFromOwnerPage(page, base, {
		listPath: '/school/guardians',
		idPattern: /\/school\/guardians\/[^/?]+/,
		openPattern: ADD_GUARDIAN,
		email,
		firstName: 'Invited',
		lastName: 'Guardian',
	});
}

export async function readStaffInviteTokenFromList(
	page: Page,
	base: string,
	email: string,
): Promise<string> {
	await page.goto(`${stripTrailingSlash(base)}/school/staff`, { waitUntil: 'domcontentloaded' });
	await page.locator('aside#app-sidebar').waitFor({ state: 'visible', timeout: 30_000 });
	await waitForPageQuery(page);
	const row = page.locator('main').getByText(email, { exact: false }).first();
	await row.waitFor({ state: 'visible', timeout: 20_000 });
	await row.click();
	await page.waitForURL(/\/school\/staff\/[^/?]+/, { timeout: 30_000 });
	await waitForPageQuery(page);
	return sendOrReadInvitationToken(page);
}

export async function assertWizardStaffInviteSent(
	page: Page,
	base: string,
	email: string,
	provisionedInviteCount: number,
): Promise<void> {
	await page.goto(`${stripTrailingSlash(base)}/school/staff`, { waitUntil: 'domcontentloaded' });
	await page.locator('aside#app-sidebar').waitFor({ state: 'visible', timeout: 30_000 });
	await waitForPageQuery(page);
	const row = page.locator('main').getByText(email, { exact: false }).first();
	const visible = await row.waitFor({ state: 'visible', timeout: 20_000 }).then(() => true).catch(() => false);
	if (visible) {
		if (provisionedInviteCount >= 1) {
			return;
		}
		await row.click();
		await page.waitForURL(/\/school\/staff\/[^/?]+/, { timeout: 30_000 });
		await waitForPageQuery(page);
		await sendOrReadInvitationToken(page);
		return;
	}
	throw new Error(
		`Wizard staff invite for ${email} was not sent (provision invitedCount=${provisionedInviteCount})`,
	);
}

async function expectStaffLanding(page: Page): Promise<void> {
	if (page.url().includes('/onboarding')) {
		throw new Error(`Invited staff landed on onboarding: ${page.url()}`);
	}
	await expectAppDashboard(page);
}

async function expectTeacherLanding(page: Page): Promise<void> {
	if (page.url().includes('/dashboard') || page.url().includes('/onboarding')) {
		throw new Error(`Teacher invite should not enter the staff app: ${page.url()}`);
	}
	const linked = page.getByRole('heading', { name: TEACHER_LINKED }).first();
	const banner = page.getByTestId(TEACHER_PORTAL_GATE_BANNER_TEST_ID);
	const linkedVisible = await linked.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false);
	if (linkedVisible) {
		return;
	}
	await banner.waitFor({ state: 'visible', timeout: 15_000 });
	if (!page.url().includes('portal=teacher')) {
		throw new Error(`Expected teacher portal gate, got ${page.url()}`);
	}
}

async function expectGuardianLanding(page: Page): Promise<void> {
	if (page.url().includes('/dashboard') || page.url().includes('/onboarding')) {
		throw new Error(`Guardian invite should not enter the staff app: ${page.url()}`);
	}
	const linked = page.getByRole('heading', { name: GUARDIAN_LINKED }).first();
	const banner = page.getByTestId(GUARDIAN_PORTAL_GATE_BANNER_TEST_ID);
	const linkedVisible = await linked.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false);
	if (linkedVisible) {
		return;
	}
	await banner.waitFor({ state: 'visible', timeout: 15_000 });
	if (!page.url().includes('portal=guardian')) {
		throw new Error(`Expected guardian portal gate, got ${page.url()}`);
	}
}

async function expectInviteLanding(page: Page, kind: InviteAcceptKind): Promise<void> {
	if (kind === 'teacher') {
		await expectTeacherLanding(page);
		return;
	}
	if (kind === 'guardian') {
		await expectGuardianLanding(page);
		return;
	}
	await expectStaffLanding(page);
}

async function fillInviteForm(
	page: Page,
	options: { name: string; email: string; password: string; mode: 'signUp' | 'signIn' },
): Promise<void> {
	const accept = page.getByRole('button', { name: ACCEPT_INVITE });
	await accept.waitFor({ state: 'visible', timeout: 20_000 });

	await sendOtpThroughUi(page, options.email);
	if (await accept.isEnabled())
		throw new Error('Invitation acceptance enabled before contact proof');
	await verifyOtpThroughUi(page, options.email);
	await waitForEnabled(accept);
}

export async function withIsolatedPage<T>(
	browser: Browser,
	run: (page: Page) => Promise<T>,
): Promise<T> {
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	try {
		return await run(page);
	}
	catch (error) {
		await captureFailure(page, process.env.EDAYA_ARTIFACT_DIR ?? '.onboarding-run', `${process.env.EDAYA_SCENARIO_ID ?? 'invite'}-invitee`);
		throw error;
	}
	finally {
		await context.close();
	}
}

export async function acceptInviteThroughUi(
	page: Page,
	base: string,
	options: {
		token: string;
		name: string;
		email: string;
		password: string;
		kind: InviteAcceptKind;
		mode?: 'signUp' | 'signIn';
		verifyInNewPage?: boolean;
	},
): Promise<void> {
	const mode = options.mode ?? 'signUp';
	await page.goto(invitePath(base, options.token), { waitUntil: 'domcontentloaded' });
	await fillInviteForm(page, { ...options, mode });
	const target = options.verifyInNewPage ? await page.context().newPage() : page;
	try {
		if (target !== page)
			await target.goto(invitePath(base, options.token), { waitUntil: 'domcontentloaded' });
		const accept = target.getByRole('button', { name: ACCEPT_INVITE });
		await waitForEnabled(accept);
		await accept.click();
		await expectInviteLanding(target, options.kind);
	}
	catch (error) {
		await captureFailure(target, process.env.EDAYA_ARTIFACT_DIR ?? '.onboarding-run', `${process.env.EDAYA_SCENARIO_ID ?? 'invite'}-accept`);
		throw error;
	}
	finally {
		if (target !== page)
			await target.close();
	}
}

export async function acceptStaffInviteThroughUi(
	page: Page,
	base: string,
	options: { token: string; name: string; email: string; password: string; mode?: 'signUp' | 'signIn' },
): Promise<void> {
	await acceptInviteThroughUi(page, base, {
		...options,
		kind: 'staff',
		verifyInNewPage: true,
	});
}

export async function assertWrongAccountInvite(page: Page, base: string, token: string): Promise<void> {
	await page.goto(invitePath(base, token), { waitUntil: 'domcontentloaded' });
	await page.locator('.animate-spin').first().waitFor({ state: 'detached', timeout: 15_000 }).catch(() => undefined);
	const action = page.getByRole('button', { name: ACCEPT_INVITE });
	if (await action.isEnabled().catch(() => false))
		await action.click();
	await page.getByText(WRONG_ACCOUNT).first().waitFor({ state: 'visible', timeout: 20_000 });
	const accept = page.getByRole('button', { name: ACCEPT_INVITE });
	if (await accept.isVisible().catch(() => false) && await accept.isEnabled().catch(() => false)) {
		throw new Error(`Wrong-account invite left Accept enabled on ${page.url()}`);
	}
	if (page.url().includes('/dashboard') && !page.url().includes('/invite/')) {
		throw new Error(`Wrong-account invite consumed the session into ${page.url()}`);
	}
}

export async function assertRevokedInvite(page: Page, base: string, token: string): Promise<void> {
	await page.goto(invitePath(base, token), { waitUntil: 'domcontentloaded' });
	await page.locator('.animate-spin').first().waitFor({ state: 'detached', timeout: 15_000 }).catch(() => undefined);
	await page.getByRole('heading', { name: REVOKED_INVITE }).first().waitFor({ state: 'visible', timeout: 15_000 });
}

export async function assertAlreadyAcceptedInvite(page: Page, base: string, token: string): Promise<void> {
	await page.goto(invitePath(base, token), { waitUntil: 'domcontentloaded' });
	await page.locator('.animate-spin').first().waitFor({ state: 'detached', timeout: 15_000 }).catch(() => undefined);
	await page.getByRole('heading', { name: ALREADY_ACCEPTED }).first().waitFor({ state: 'visible', timeout: 15_000 });
	if (page.url().includes('/dashboard')) {
		throw new Error(`Already-accepted invite opened the dashboard: ${page.url()}`);
	}
}
