import { chooseOption, selectControl } from './custom-select';
import {
	clickCreateButton,
	fillPersonCreateDialogWithInvite,
	openDialogButton,
	submitDialog,
	waitForDialogClosed,
	waitForPageQuery,
} from '../../../scripts/qa-harness-ui';
import { uiCommand } from './ui-command';
import { apiFetch } from '../setup/journey-api';
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
	const accessToken = await schoolBearerFromPage(page, base, undefined, apiUrl);
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
			throw new Error(`Staff invitation HTTP ${response.status()}`);
		}
	}
	finally {
		await isolated.dispose();
	}

	const response = await apiFetch(page, base, '/core/entities/staff-members/list', { method: 'POST', data: {} });
	if (!response.ok()) throw new Error(`Invited staff readback HTTP ${response.status()}`);
	const staff = await response.json() as Array<{ id: string; email: string }>;
	const invited = staff.filter(member => member.email === email);
	if (invited.length !== 1) throw new Error(`Expected one invited staff member; found ${invited.length}`);
	return invited[0]!.id;
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

	const dialog = page.getByTestId('form-modal');
	await chooseOption(selectControl(dialog, { name: /^(classe|class)$/i }), classId);
	await chooseOption(selectControl(dialog, { name: /^(matière dans la classe|subject offering)$/i }), { index: 1 });
	const response = await uiCommand(page, '/entities/teacher-assignments/save', () => submitDialog(page));
	const assignment = response.request().postDataJSON() as { id: string };
	await waitForDialogClosed(page);
	const saved = await apiFetch(page, journey.ctx.base, `/core/entities/teacher-assignments/${assignment.id}`);
	if (!saved.ok()) throw new Error(`Teacher assignment readback HTTP ${saved.status()}`);
	const persisted = await saved.json() as { teacherId: string; classGroupId: string };
	if (persisted.teacherId !== teacherId || persisted.classGroupId !== classId) throw new Error('Teacher assignment did not persist in the requested class');
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
): Promise<SecondaryAccounts> {
	const { page, base } = journey.ctx;
	const apiUrl = resolveApiUrl();
	const appOrigin = base;

	const teacherEmail = createSecondaryEmail('teacher');
	const teacherPassword = createSecondaryPassword();
	const educatorEmail = createSecondaryEmail('educator');
	const educatorPassword = createSecondaryPassword();

	let teacherId = '';
	try {
		const created = await createTeacherWithInvite(journey, teacherEmail);
		if (!created.teacherId) {
			throw new Error(`Teacher invite create failed for ${teacherEmail}: no teacher id`);
		}
		teacherId = created.teacherId;
		let teacherToken = created.token;
		if (!teacherToken) {
			teacherToken = await resendTeacherInvitation(journey, teacherId);
		}
		if (!teacherToken) {
			teacherToken = await resendInvitationTokenViaApi(page, base, teacherId);
		}
		const teacherActivation = await activateTeacherSecondaryAccount(
			apiUrl,
			appOrigin,
			teacherEmail,
			teacherPassword,
			'E2E Teacher',
			teacherToken,
		);
		if (!teacherActivation.ok) {
			throw new Error(
				`Teacher invitation did not activate for ${teacherEmail}: ${teacherActivation.detail ?? 'unknown'}`,
			);
		}
		if (!await assignTeacherToClass(journey, teacherId, entities.classId)) throw new Error('Required teacher class assignment missing');
		logStep(journey, {
			step: 'secondary-teacher',
			ok: true,
			detail: teacherEmail,
			entityId: teacherId,
		});
	}
	catch (err) {
		logStep(journey, {
			step: 'secondary-teacher',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		});
		throw err;
	}

	let educatorStaffId = '';
	try {
		const createdStaffId = await inviteEducatorStaff(journey, apiUrl, educatorEmail);
		if (!createdStaffId) {
			throw new Error(`Educator staff invite failed for ${educatorEmail}: no staff id`);
		}
		educatorStaffId = createdStaffId;
		entities.staffId = educatorStaffId;
		let educatorToken = await resendStaffInvitation(journey, educatorStaffId);
		if (!educatorToken) {
			educatorToken = await resendInvitationTokenViaApi(page, base, educatorStaffId);
		}
		const educatorActivation = await activateSecondaryAccount(
			journey,
			apiUrl,
			appOrigin,
			educatorEmail,
			educatorPassword,
			'E2E Educator',
			educatorToken,
			() => resendStaffInvitation(journey, educatorStaffId),
		);
		if (!educatorActivation.ok) {
			throw new Error(
				`Educator invitation did not activate for ${educatorEmail}: ${educatorActivation.detail ?? 'unknown'}`,
			);
		}
		logStep(journey, {
			step: 'secondary-educator',
			ok: true,
			detail: educatorEmail,
			entityId: educatorStaffId,
		});
	}
	catch (err) {
		logStep(journey, {
			step: 'secondary-educator',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		});
		throw err;
	}

	return {
		teacher: { email: teacherEmail, password: teacherPassword, entityId: teacherId },
		educator: { email: educatorEmail, password: educatorPassword, entityId: educatorStaffId },
	};
}
