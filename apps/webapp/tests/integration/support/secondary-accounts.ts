import {
	clickCreateButton,
	fillPersonCreateDialogWithInvite,
	openDialogButton,
	selectComboboxOption,
	submitDialog,
	waitForDialogClosed,
	waitForPageQuery,
} from '../../../scripts/qa-harness-ui';
import { firstIdFromLinks } from '../../../scripts/qa-matrix-support';
import type { MatrixEntities } from '../../../scripts/qa-matrix-support';
import {
	acceptInvitationTokenWithRetry,
	activateTeacherSecondaryAccount,
	createSecondaryEmail,
	createSecondaryPassword,
	type SecondaryAccounts,
} from './api-provision';
import {
	gotoApp,
	idFromUrl,
	logStep,
	waitForInvitationToken,
	type UiJourney,
} from '../setup/journey-context';
import {
	createTeacherWithInvitationViaApi,
	linkActorSubjectViaApi,
	resendInvitationTokenViaApi,
} from '../setup/journey-api';
import { resolveApiUrl } from './integration-hosts';
import { schoolBearerFromPage } from './playwright-identity';

export type { SecondaryAccounts } from './api-provision';

async function inviteEducatorStaff(
	journey: UiJourney,
	apiUrl: string,
	email: string,
): Promise<string | null> {
	const { page, base } = journey.ctx;
	const accessToken = await schoolBearerFromPage(page, base);
	const { request } = await import('playwright');
	const isolated = await request.newContext({
		extraHTTPHeaders: {
			'content-type': 'application/json',
			origin: base,
			...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
		},
	});
	try {
		const response = await isolated.post(`${apiUrl}/core/onboarding/invite-staff-members`, {
			data: {
				invites: [{ email, role: 'cpe' }],
			},
		});
		if (!response.ok()) {
			return null;
		}
	}
	finally {
		await isolated.dispose();
	}

	await gotoApp(journey, '/school/staff');
	await waitForPageQuery(page);
	const row = page.locator('main').getByText(email, { exact: false }).first();
	if (await row.isVisible({ timeout: 10_000 }).catch(() => false)) {
		await row.click();
		await page.waitForTimeout(800);
		const fromUrl = page.url().match(/\/school\/staff\/([^/?]+)/)?.[1];
		if (fromUrl) {
			return fromUrl;
		}
	}
	return firstIdFromLinks(page, /\/school\/staff\/([^/?]+)/);
}

async function resendStaffInvitation(journey: UiJourney, staffId: string): Promise<string | null> {
	const { page } = journey.ctx;
	await gotoApp(journey, `/school/staff/${staffId}/profile`);
	await waitForPageQuery(page);
	const inviteBtn = page.getByRole('button', { name: /send invitation|envoyer une invitation|resend|renvoyer/i }).first();
	if (!(await inviteBtn.isVisible({ timeout: 8_000 }).catch(() => false))) {
		return null;
	}
	const resultPromise = waitForInvitationToken(page, 25_000);
	await inviteBtn.click();
	return resultPromise;
}

async function resendTeacherInvitation(journey: UiJourney, teacherId: string): Promise<string | null> {
	const { page } = journey.ctx;
	await gotoApp(journey, `/school/teachers/${teacherId}/profile`);
	await waitForPageQuery(page);
	const inviteBtn = page.getByRole('button', { name: /send invitation|envoyer une invitation|resend|renvoyer/i }).first();
	if (!(await inviteBtn.isVisible({ timeout: 8_000 }).catch(() => false))) {
		return null;
	}
	const resultPromise = waitForInvitationToken(page, 25_000);
	await inviteBtn.click();
	return resultPromise;
}

async function createTeacherWithInvite(
	journey: UiJourney,
	email: string,
): Promise<{ teacherId: string | null; token: string | null }> {
	const { page, base } = journey.ctx;
	const apiCreated = await createTeacherWithInvitationViaApi(page, base, email);
	if (apiCreated?.teacherId) {
		let token = apiCreated.token || null;
		if (!token) {
			token = await resendTeacherInvitation(journey, apiCreated.teacherId);
		}
		return { teacherId: apiCreated.teacherId, token };
	}

	await gotoApp(journey, '/school/teachers');
	const opened = await openDialogButton(page, /add teacher|ajouter un enseignant/i, 20_000)
		|| await clickCreateButton(page, 'Créer enseignant', '/school/teachers');
	if (!opened) {
		return { teacherId: null, token: null };
	}

	const resultPromise = waitForInvitationToken(page, 45_000);
	await fillPersonCreateDialogWithInvite(page, {
		email,
		firstName: 'E2E',
		lastName: `Teacher-${Date.now()}`,
	});
	await waitForDialogClosed(page);
	let token = await resultPromise;

	await gotoApp(journey, '/school/teachers');
	await waitForPageQuery(page);
	const row = page.locator('main').getByText(email, { exact: false }).first();
	let teacherId: string | null = null;
	if (await row.isVisible({ timeout: 12_000 }).catch(() => false)) {
		await row.click();
		await page.waitForTimeout(800);
		teacherId = idFromUrl(page, /\/school\/teachers\/([^/?]+)/);
	}
	if (!teacherId) {
		teacherId = idFromUrl(page, /\/school\/teachers\/([^/?]+)/);
	}

	if (teacherId && !token) {
		token = await resendTeacherInvitation(journey, teacherId);
	}

	return { teacherId, token };
}

async function assignTeacherToClass(
	journey: UiJourney,
	teacherId: string,
	classId: string | null,
): Promise<boolean> {
	if (!classId) {
		return false;
	}
	const { page } = journey.ctx;
	await gotoApp(journey, `/school/teachers/${teacherId}/assignments`);
	const opened = await openDialogButton(page, /assign|affecter|ajouter/i);
	if (!opened) {
		return false;
	}

	const dialog = page.getByRole('dialog');
	const classSelect = dialog.locator('select').first();
	if (await classSelect.isVisible().catch(() => false)) {
		await classSelect.selectOption(classId).catch(async () => {
			const options = classSelect.locator('option');
			if (await options.count() > 1) {
				await classSelect.selectOption({ index: 1 });
			}
		});
		await page.waitForTimeout(1_000);
	}

	const subjectSelect = dialog.locator('select').nth(1);
	if (await subjectSelect.isVisible().catch(() => false)) {
		const optionCount = await subjectSelect.locator('option').count();
		if (optionCount > 1) {
			await subjectSelect.selectOption({ index: 1 });
		}
	}
	else {
		const combo = dialog.getByRole('combobox').first();
		if (await combo.isVisible().catch(() => false)) {
			await selectComboboxOption(page, combo);
		}
	}

	await submitDialog(page);
	await waitForDialogClosed(page).catch(() => {});
	return true;
}

async function activateSecondaryAccount(
	journey: UiJourney,
	apiUrl: string,
	appOrigin: string,
	email: string,
	password: string,
	name: string,
	token: string | null,
	refreshToken?: () => Promise<string | null>,
): Promise<{ ok: boolean; detail?: string }> {
	let invitationToken = token;
	if (!invitationToken && refreshToken) {
		invitationToken = await refreshToken();
	}
	if (!invitationToken) {
		return { ok: false, detail: 'no invitation token' };
	}
	return acceptInvitationTokenWithRetry(apiUrl, appOrigin, email, password, name, invitationToken, {
		refreshToken,
	});
}

export async function provisionSecondaryAccounts(
	journey: UiJourney,
	entities: MatrixEntities,
): Promise<SecondaryAccounts | null> {
	const { page, base } = journey.ctx;
	const apiUrl = resolveApiUrl();
	const appOrigin = base;

	const teacherEmail = createSecondaryEmail('teacher');
	const teacherPassword = createSecondaryPassword();
	const educatorEmail = createSecondaryEmail('educator');
	const educatorPassword = createSecondaryPassword();

	let teacherId: string | null = null;
	let teacherToken: string | null = null;
	let teacherOk = false;
	try {
		const created = await createTeacherWithInvite(journey, teacherEmail);
		teacherId = created.teacherId;
		teacherToken = created.token;
		if (teacherId && !teacherToken) {
			teacherToken = await resendTeacherInvitation(journey, teacherId);
		}
		if (teacherId && !teacherToken) {
			teacherToken = await resendInvitationTokenViaApi(page, base, teacherId);
		}
		const resolvedTeacherId = teacherId;
		const teacherActivation = resolvedTeacherId
			? await activateTeacherSecondaryAccount(
				apiUrl,
				appOrigin,
				teacherEmail,
				teacherPassword,
				'E2E Teacher',
				teacherToken,
				resolvedTeacherId,
				subjectId => linkActorSubjectViaApi(page, base, { subjectId, teacherId: resolvedTeacherId }),
			)
			: await activateSecondaryAccount(
				journey,
				apiUrl,
				appOrigin,
				teacherEmail,
				teacherPassword,
				'E2E Teacher',
				teacherToken,
			);
		teacherOk = teacherActivation.ok;
		if (teacherOk && teacherId) {
			await assignTeacherToClass(journey, teacherId, entities.classId);
		}
		logStep(journey, {
			step: 'secondary-teacher',
			ok: teacherOk && Boolean(teacherId),
			detail: teacherActivation.detail ? `${teacherEmail} (${teacherActivation.detail})` : teacherEmail,
			entityId: teacherId ?? undefined,
		});
	}
	catch (err) {
		logStep(journey, {
			step: 'secondary-teacher',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		});
	}

	let educatorStaffId: string | null = null;
	let educatorToken: string | null = null;
	let educatorOk = false;
	try {
		educatorStaffId = await inviteEducatorStaff(journey, apiUrl, educatorEmail);
		if (educatorStaffId) {
			entities.staffId = educatorStaffId;
			educatorToken = await resendStaffInvitation(journey, educatorStaffId);
			if (!educatorToken) {
				educatorToken = await resendInvitationTokenViaApi(page, base, educatorStaffId);
			}
		}
		const resolvedEducatorStaffId = educatorStaffId;
		const educatorActivation = await activateSecondaryAccount(
			journey,
			apiUrl,
			appOrigin,
			educatorEmail,
			educatorPassword,
			'E2E Educator',
			educatorToken,
			resolvedEducatorStaffId
				? () => resendStaffInvitation(journey, resolvedEducatorStaffId)
				: undefined,
		);
		educatorOk = educatorActivation.ok;
		logStep(journey, {
			step: 'secondary-educator',
			ok: educatorOk && Boolean(educatorStaffId),
			detail: educatorActivation.detail ? `${educatorEmail} (${educatorActivation.detail})` : educatorEmail,
			entityId: educatorStaffId ?? undefined,
		});
	}
	catch (err) {
		logStep(journey, {
			step: 'secondary-educator',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		});
	}

	if (!teacherOk || !educatorOk || !teacherId || !educatorStaffId) {
		const partial: SecondaryAccounts = {};
		if (teacherOk && teacherId) {
			partial.teacher = { email: teacherEmail, password: teacherPassword, entityId: teacherId };
		}
		if (educatorOk && educatorStaffId) {
			partial.educator = { email: educatorEmail, password: educatorPassword, entityId: educatorStaffId };
		}
		return partial.teacher || partial.educator ? partial : null;
	}

	return {
		teacher: { email: teacherEmail, password: teacherPassword, entityId: teacherId },
		educator: { email: educatorEmail, password: educatorPassword, entityId: educatorStaffId },
	};
}
