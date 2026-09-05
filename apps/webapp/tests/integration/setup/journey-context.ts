/**
 * Shared Playwright helpers for the owner UI journey.
 */
import type { Page } from 'playwright';
import type { DemoContext } from '../demo-dry-run/support/types';
import { ensureDailyAttendanceMode } from '../demo-dry-run/support/setup';
import {
	addAnnouncementTargetViaApi,
	ensureDailyAttendanceViaApi,
	publishAnnouncementCommandViaApi,
	recordDailyAttendanceViaApi,
} from './journey-api';
import {
	assertNoFatalError,
	emptyEntities,
	waitForAppShell,
	type MatrixEntities,
	type MatrixResult,
	type MatrixStatut,
} from '../../../scripts/qa-matrix-support';
import {
	dismissOpenDialogs,
	dismissPageError,
	refreshAppShell,
	REMOVE_ANNOUNCEMENT_TARGET_CONTROL,
	submitDialog,
	waitForDialogClosed,
	waitForPageQuery,
} from '../../../scripts/qa-harness-ui';
import type { QaTemplateRow } from '../../../scripts/qa-template-matrix.manual';
import { JourneyLedger } from './journey-ledger';

export interface SetupStepResult {
	step: string;
	ok: boolean;
	blocked?: boolean;
	detail?: string;
	entityId?: string;
}

export interface UiJourney {
	ctx: DemoContext;
	entities: MatrixEntities;
	ledger: JourneyLedger;
	steps: SetupStepResult[];
	onRecord: (result: MatrixResult) => void;
}

export function createUiJourney(
	ctx: DemoContext,
	matrix: readonly QaTemplateRow[],
	onRecord: (result: MatrixResult) => void,
): UiJourney {
	return {
		ctx,
		entities: emptyEntities(),
		ledger: new JourneyLedger(matrix),
		steps: [],
		onRecord,
	};
}

export async function gotoApp(journey: UiJourney, routePath: string): Promise<void> {
	const { page, base } = journey.ctx;
	await dismissOpenDialogs(page);
	const target = `${base}${routePath}`;
	await page.goto(target, { waitUntil: 'domcontentloaded' });
	try {
		await waitForAppShell(page);
	}
	catch {
		await page.keyboard.press('Escape').catch(() => {});
		await refreshAppShell(page, base);
		await page.goto(target, { waitUntil: 'domcontentloaded' });
		await waitForAppShell(page);
	}
	await waitForPageQuery(page);
	await dismissPageError(page);
}

export async function visitCovered(
	journey: UiJourney,
	templatePath: string,
	actualPath: string,
	statutIfOk: MatrixStatut = 'OK',
): Promise<string | null> {
	try {
		await gotoApp(journey, actualPath);
	}
	catch (err) {
		try {
			await refreshAppShell(journey.ctx.page, journey.ctx.base);
			await gotoApp(journey, actualPath);
		}
		catch (retryErr) {
			const detail = (retryErr instanceof Error ? retryErr.message : err instanceof Error ? err.message : String(retryErr)).slice(0, 200);
			for (const result of journey.ledger.coverVisit(templatePath, 'NOT OK', detail)) {
				journey.onRecord(result);
			}
			return detail;
		}
	}
	const fatal = await assertNoFatalError(journey.ctx.page);
	const statut: MatrixStatut = fatal ? 'NOT OK' : statutIfOk;
	const detail = fatal ?? undefined;
	for (const result of journey.ledger.coverVisit(templatePath, statut, detail)) {
		journey.onRecord(result);
	}
	return fatal;
}

export function coverActions(
	journey: UiJourney,
	templatePath: string,
	actions: readonly string[],
	statut: MatrixStatut,
	detail?: string,
): void {
	for (const result of journey.ledger.coverPath(templatePath, statut, detail, actions)) {
		journey.onRecord(result);
	}
}

export function coverModal(
	journey: UiJourney,
	parentRoute: string,
	modal: string,
	statut: MatrixStatut,
	detail?: string,
): void {
	for (const result of journey.ledger.coverModal(parentRoute, modal, statut, detail)) {
		journey.onRecord(result);
	}
}

export function logStep(journey: UiJourney, result: SetupStepResult): void {
	journey.steps.push(result);
	const tag = result.blocked ? '⊘' : result.ok ? '✓' : '✗';
	console.log(`${tag} ${result.step}${result.detail ? ` — ${result.detail.slice(0, 120)}` : ''}`);
}

function commandPublicName(fragment: string): string {
	if (fragment.includes('-')) {
		return fragment;
	}
	return fragment.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, '');
}

function matchesCommandResponse(url: string, commandFragment: string): boolean {
	const publicName = commandPublicName(commandFragment);
	return url.includes(`/core/commands/${publicName}`)
		|| url.includes(`/core/commands/${commandFragment}`);
}

async function waitForCommandResponse(
	page: Page,
	commandFragment: string,
	timeout = 45_000,
): Promise<import('playwright').Response | null> {
	return page.waitForResponse(
		res => res.request().method() === 'POST' && matchesCommandResponse(res.url(), commandFragment),
		{ timeout },
	).catch(() => null);
}

export async function waitForCommandPayload(
	page: Page,
	commandFragment: string,
	timeout = 45_000,
): Promise<Record<string, unknown> | null> {
	const response = await waitForCommandResponse(page, commandFragment, timeout);
	if (!response?.ok()) {
		return null;
	}
	const postData = response.request().postData();
	if (postData) {
		try {
			return JSON.parse(postData) as Record<string, unknown>;
		}
		catch {
			// fall through to response body
		}
	}
	try {
		return await response.json() as Record<string, unknown>;
	}
	catch {
		return null;
	}
}

/** Parse command **response** JSON (e.g. send-account-invitation token). */
export async function waitForCommandResult(
	page: Page,
	commandFragment: string,
	timeout = 45_000,
): Promise<Record<string, unknown> | null> {
	const response = await waitForCommandResponse(page, commandFragment, timeout);
	if (!response?.ok()) {
		return null;
	}
	try {
		return await response.json() as Record<string, unknown>;
	}
	catch {
		return null;
	}
}

/** Wait for send- or resend-account-invitation and return the invitation token. */
export async function waitForInvitationToken(page: Page, timeout = 45_000): Promise<string | null> {
	const response = await page.waitForResponse(
		res => res.request().method() === 'POST'
			&& (res.url().includes('/core/commands/send-account-invitation')
				|| res.url().includes('/core/commands/resend-account-invitation'))
			&& res.ok(),
		{ timeout },
	).catch(() => null);
	if (!response) {
		return null;
	}
	try {
		const body = await response.json() as { token?: string };
		return typeof body.token === 'string' ? body.token : null;
	}
	catch {
		return null;
	}
}

const ADD_TARGET_CONTROL = /add recipient|add target|ajouter un destinataire|ajouter une cible|gérer les cibles|manage targets/i;

async function inspectRemoveAnnouncementTarget(
	journey: UiJourney,
	announcementId: string,
): Promise<boolean> {
	const { page } = journey.ctx;
	await gotoApp(journey, `/school/announcements/${announcementId}`);
	await waitForPageQuery(page);
	return page.getByRole('button', { name: REMOVE_ANNOUNCEMENT_TARGET_CONTROL })
		.first()
		.isVisible({ timeout: 8_000 })
		.catch(() => false);
}

export async function publishAnnouncement(
	journey: UiJourney,
	announcementId: string,
): Promise<{ ok: boolean; detail: string; removeTargetVisible: boolean }> {
	const { page } = journey.ctx;
	const viaApiAfterAddTarget = async (
		reason: string,
		removeTargetVisible: boolean,
	): Promise<{ ok: boolean; detail: string; removeTargetVisible: boolean }> => {
		const ok = await publishAnnouncementCommandViaApi(page, journey.ctx.base, announcementId);
		return { ok, detail: ok ? reason : `${reason}; API fallback failed`, removeTargetVisible };
	};
	const viaApiFromScratch = async (
		reason: string,
	): Promise<{ ok: boolean; detail: string; removeTargetVisible: boolean }> => {
		const added = await addAnnouncementTargetViaApi(page, journey.ctx.base, announcementId);
		if (!added) {
			return { ok: false, detail: `${reason}; add-target API failed`, removeTargetVisible: false };
		}
		const removeTargetVisible = await inspectRemoveAnnouncementTarget(journey, announcementId);
		return viaApiAfterAddTarget(reason, removeTargetVisible);
	};

	await gotoApp(journey, `/school/announcements/${announcementId}?modal=add-target`);
	await waitForPageQuery(page);

	const dialog = page.getByRole('dialog');
	if (!(await dialog.isVisible({ timeout: 12_000 }).catch(() => false))) {
		const addTargetControl = page.getByRole('button', { name: ADD_TARGET_CONTROL })
			.or(page.getByRole('menuitem', { name: ADD_TARGET_CONTROL }))
			.first();
		if (await addTargetControl.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await addTargetControl.click();
		}
		if (!(await dialog.isVisible({ timeout: 8_000 }).catch(() => false))) {
			return viaApiFromScratch('add-target modal not visible');
		}
	}

	const addTargetPromise = waitForCommandPayload(page, 'add-target', 30_000);
	try {
		await submitDialog(page, /^add$|^ajouter$/i);
	}
	catch {
		return viaApiFromScratch('add-target submit failed');
	}
	const addTargetPayload = await addTargetPromise;
	if (!addTargetPayload) {
		return viaApiFromScratch('add-target command not observed');
	}
	await waitForDialogClosed(page).catch(() => {});
	await page.waitForTimeout(800);

	const removeTargetVisible = await inspectRemoveAnnouncementTarget(journey, announcementId);

	await gotoApp(journey, `/school/announcements/${announcementId}?modal=publish`);
	await waitForPageQuery(page);
	const publishDialog = page.getByRole('dialog');
	if (!(await publishDialog.isVisible({ timeout: 12_000 }).catch(() => false))) {
		const publishBtn = page.getByRole('button', { name: /^publish$|^publier$/i }).first();
		if (!(await publishBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
			return viaApiAfterAddTarget('publish modal/button not visible', removeTargetVisible);
		}
		const publishPromise = waitForCommandPayload(page, 'publish-announcement', 25_000);
		await publishBtn.click();
		if (!await publishPromise) {
			return viaApiAfterAddTarget('publish command not observed after button', removeTargetVisible);
		}
		await waitForPageQuery(page);
		return { ok: true, detail: 'published via button', removeTargetVisible };
	}

	const publishPromise = waitForCommandPayload(page, 'publish-announcement', 30_000);
	try {
		await submitDialog(page, /^publish$|^publier$/i);
	}
	catch {
		return viaApiAfterAddTarget('publish submit failed', removeTargetVisible);
	}
	if (!await publishPromise) {
		return viaApiAfterAddTarget('publish command not observed', removeTargetVisible);
	}
	await waitForPageQuery(page);
	if (await page.getByText(/published|publiée/i).first().isVisible({ timeout: 3_000 }).catch(() => false)) {
		return { ok: true, detail: 'published via modal', removeTargetVisible };
	}
	return viaApiAfterAddTarget('publish confirmation not visible', removeTargetVisible);
}

async function recordCompletionFilterFixtureDays(
	page: Page,
	base: string,
	classId: string,
	studentId?: string | null,
): Promise<void> {
	const isoDay = (offsetDays: number) => {
		const next = new Date();
		next.setUTCDate(next.getUTCDate() + offsetDays);
		return next.toISOString().slice(0, 10);
	};
	await recordDailyAttendanceViaApi(page, base, classId, studentId);
	await recordDailyAttendanceViaApi(page, base, classId, studentId, undefined, {
		date: isoDay(-1),
		attendanceByStudent: studentId ? { [studentId]: 'present' } : {},
	});
	await recordDailyAttendanceViaApi(page, base, classId, null, undefined, {
		date: isoDay(-2),
		attendanceByStudent: {},
	});
}

export async function recordAttendanceForToday(
	journey: UiJourney,
	classId: string,
): Promise<string | null> {
	const { page, base } = journey.ctx;
	const homeroomStaffId = journey.entities.staffId;
	await ensureDailyAttendanceMode(journey.ctx, classId, { force: true });
	await ensureDailyAttendanceViaApi(page, base, classId, homeroomStaffId);

	const today = new Date().toISOString().slice(0, 10);
	const dayId = `${classId}:${today}`;

	await gotoApp(journey, `/classes/${classId}/attendance/${encodeURIComponent(dayId)}`);
	await waitForPageQuery(page);
	await page.waitForTimeout(1_000);

	const onDayDetail = page.url().includes(`/attendance/${encodeURIComponent(dayId)}`)
		|| page.url().includes(`/attendance/${dayId}`);

	if (!onDayDetail) {
		await gotoApp(journey, `/classes/${classId}/attendance`);
		await waitForPageQuery(page);
		const dayButton = page.locator('main button').filter({ hasText: /roll call|appel|daily roll call|appel du jour/i }).first();
		if (await dayButton.isVisible({ timeout: 12_000 }).catch(() => false)) {
			await dayButton.click();
			await page.waitForTimeout(1_000);
		}
		else {
			await recordCompletionFilterFixtureDays(page, base, classId, journey.entities.studentId);
			return dayId;
		}
	}

	const resolvedDayId = idFromUrl(page, /\/attendance\/([^/?]+)/) ?? dayId;

	const markAll = page.getByRole('button', { name: /mark all present|tout marquer présent|marquer tous présents|tous présents/i }).first();
	if (await markAll.isVisible({ timeout: 8_000 }).catch(() => false)) {
		await markAll.click();
		await page.waitForTimeout(1_500);
	}
	else {
		const recordBtn = page.getByRole('button', { name: /record|enregistrer|saisir|pointer/i }).first();
		if (await recordBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await recordBtn.click();
			const dialog = page.getByRole('dialog');
			if (await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
				await dialog.getByRole('button', { name: /save|enregistrer/i }).last().click();
				await waitForDialogClosed(page).catch(() => {});
			}
		}
	}

	await recordCompletionFilterFixtureDays(page, base, classId, journey.entities.studentId);
	return resolvedDayId;
}

export function idFromUrl(page: Page, pattern: RegExp): string | null {
	return page.url().match(pattern)?.[1] ?? null;
}

export async function clickFirstRow(page: Page): Promise<boolean> {
	const row = page.locator('main [role="button"][tabindex="0"], main table tbody tr, main a[href]').first();
	if (!(await row.isVisible({ timeout: 8_000 }).catch(() => false))) {
		return false;
	}
	await row.click();
	await page.waitForTimeout(600);
	return true;
}
