/**
 * Shared Playwright helpers for the owner UI journey.
 */
import assert from 'node:assert/strict';
import { uiCommand, waitForMutationDialog } from '../support/ui-command';
import type { Page } from 'playwright';
import type { DemoContext } from '../demo-dry-run/support/types';
import { ensureDailyAttendanceMode } from '../demo-dry-run/support/setup';
import {
	apiFetch,
	ensureDailyAttendanceViaApi,
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
	assertListContains,
	confirmDialog,
	dismissOpenDialogs,
	dismissPageError,
	navigateSpaPage,
	openDialogButton,
	openUrlModal,
	refreshAppShell,
	REMOVE_ANNOUNCEMENT_TARGET_CONTROL,
	submitDialog,
	waitForDialogClosed,
	waitForPageQuery,
	waitForSubmitEnabled,
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
	await navigateSpaPage(page, target);
	try {
		await waitForAppShell(page);
	}
	catch {
		await page.keyboard.press('Escape').catch(() => {});
		await refreshAppShell(page, base);
		await navigateSpaPage(page, target);
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

/** Cover a mutation only after open, submit, close, and a visible or API-confirmed postcondition. */
export function coverCompletedModal(
	journey: UiJourney,
	parentRoute: string,
	modal: string,
	input: {
		opened: boolean;
		submitted: boolean;
		closed: boolean;
		postcondition?: boolean;
	},
	detail?: string,
): void {
	const ok = input.opened
		&& input.submitted
		&& input.closed
		&& input.postcondition === true;
	coverModal(journey, parentRoute, modal, ok ? 'OK' : 'NOT OK', detail);
}

/** Unexercised mutation actions are N/A. Exercised ones are OK only with a confirmed postcondition. */
export function coverMutationActions(
	journey: UiJourney,
	templatePath: string,
	actions: readonly string[],
	input: {
		exercised: boolean;
		postcondition?: boolean;
	},
	detail?: string,
): void {
	if (!input.exercised) {
		coverActions(journey, templatePath, actions, 'NOT OK', detail ?? 'Required mutation was not exercised');
		return;
	}
	coverActions(
		journey,
		templatePath,
		actions,
		input.postcondition === true ? 'OK' : 'NOT OK',
		detail,
	);
}

export async function runModalMutation(
	journey: UiJourney,
	input: {
		parentRoute: string;
		modal: string;
		pathname: string;
		target?: string;
		command: string;
		fill?: (page: import('playwright').Page) => Promise<void>;
		submit?: 'form' | 'confirm';
		confirmLabel?: RegExp;
		openLabel?: RegExp;
		visibleAfter?: string;
		verifyPersisted?: (page: Page) => Promise<void>;
		listPath?: string;
		actionPath?: string;
		actions?: readonly string[];
	},
): Promise<{ opened: boolean; submitted: boolean; closed: boolean; postcondition: boolean; result: Record<string, unknown> | null }> {
	const { page, base } = journey.ctx;
	await dismissOpenDialogs(page);
	let opened = false;
	if (input.openLabel) {
		await gotoApp(journey, input.pathname);
		opened = await openDialogButton(page, input.openLabel, 15_000);
	}
	if (!opened) {
		opened = await openUrlModal(page, input.pathname, input.modal, {
			target: input.target,
			base,
		});
	}
	if (!opened && input.openLabel) {
		opened = await openDialogButton(page, input.openLabel, 15_000);
	}
	if (!opened) {
		coverCompletedModal(journey, input.parentRoute, input.modal, {
			opened: false,
			submitted: false,
			closed: false,
		}, `${input.modal} not found`);
		if (input.actions && input.actionPath) {
			coverMutationActions(journey, input.actionPath, input.actions, { exercised: false }, `${input.modal} not found`);
		}
		return { opened: false, submitted: false, closed: false, postcondition: false, result: null };
	}

	if (input.fill) {
		await input.fill(page);
	}
	const resultPromise = waitForCommandResult(page, input.command);
	let submitted = true;
	if (input.submit === 'confirm') {
		submitted = await confirmDialog(page, input.confirmLabel);
	}
	else {
		await waitForSubmitEnabled(page, 15_000).catch(() => {});
		try {
			await submitDialog(page);
		}
		catch {
			submitted = false;
		}
	}
	const closed = submitted
		? await waitForDialogClosed(page).catch(() => false)
		: false;
	const result = submitted ? await resultPromise : null;
	if (!submitted) {
		console.log(`modal ${input.modal} submit stayed disabled (${input.command})`);
	}
	else if (!result) {
		console.log(`modal ${input.modal} command ${input.command} had no ok response`);
	}
	if (!submitted || !closed || !result) {
		await journey.ctx.shot(`failure-mutation-${input.command.replaceAll('/', '-')}-${input.modal}`);
	}
	if (input.listPath) {
		await gotoApp(journey, input.listPath);
		await waitForPageQuery(page);
	}
	const visible = input.visibleAfter
		? await assertListContains(page, input.visibleAfter, true, 12_000)
		: false;
	let persisted = true;
	if (input.verifyPersisted) {
		try { await input.verifyPersisted(page); }
		catch { persisted = false; }
	}
	const postcondition = submitted && closed && result !== null && (!input.visibleAfter || visible) && persisted;
	if (!postcondition) await journey.ctx.shot(`failure-postcondition-${input.command.replaceAll('/', '-')}-${input.modal}`);
	coverCompletedModal(journey, input.parentRoute, input.modal, {
		opened: true,
		submitted,
		closed,
		postcondition,
	}, input.visibleAfter);
	if (input.actions && input.actionPath) {
		coverMutationActions(
			journey,
			input.actionPath,
			input.actions,
			{ exercised: true, postcondition },
			input.visibleAfter,
		);
	}
	return { opened: true, submitted, closed, postcondition, result };
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
		|| url.includes(`/core/commands/${commandFragment}`)
		|| url.includes(`/core/entities/${commandFragment}`)
		|| url.includes(`/core/entities/${publicName}`);
}

async function waitForCommandResponse(
	page: Page,
	commandFragment: string,
	timeout = 45_000,
): Promise<import('playwright').Response | null> {
	return page.waitForResponse(
		(res) => {
			if (res.request().method() !== 'POST' || !matchesCommandResponse(res.url(), commandFragment)) {
				return false;
			}
			if (!res.ok()) {
				console.log(`command ${commandFragment} status=${res.status()}`);
				return false;
			}
			return true;
		},
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

export async function publishAnnouncement(
  journey: UiJourney,
  announcementId: string,
): Promise<{ ok: boolean; detail: string; removeTargetVisible: boolean }> {
  const { page, base } = journey.ctx;
  const path = `/school/announcements/${announcementId}`;
  await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
  await waitForPageQuery(page);
  const targets = async () => {
    const response = await apiFetch(page, base, '/core/entities/announcement-targets/list', { method: 'POST', data: { announcementId } });
    assert(response.ok(), `Target readback HTTP ${response.status()}`);
    return await response.json() as Array<{ id: string }>;
  };
  const addTarget = async () => {
    assert(await openUrlModal(page, path, 'add-target', { base }));
    await uiCommand(page, '/commands/add-target', () => page.getByTestId('form-modal-submit').click());
    await waitForMutationDialog(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForPageQuery(page);
    assert((await targets()).length > 0, 'Added announcement recipient must persist');
  };
  await addTarget();
  const before = await targets();
  await page.getByRole('button', { name: REMOVE_ANNOUNCEMENT_TARGET_CONTROL }).first().click();
  await uiCommand(page, '/entities/announcement-targets/delete', () => page.getByRole('dialog').getByRole('button', { name: REMOVE_ANNOUNCEMENT_TARGET_CONTROL }).click());
  await waitForMutationDialog(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForPageQuery(page);
  assert.equal((await targets()).length, before.length - 1, 'Removed recipient must stay absent after reload');
  await addTarget();
  assert(await openUrlModal(page, path, 'publish', { base }));
  await uiCommand(page, '/commands/publish-announcement', () => page.getByTestId('form-modal-submit').click());
  await waitForMutationDialog(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForPageQuery(page);
  const response = await apiFetch(page, base, `/core/entities/announcements/${announcementId}`);
  assert(response.ok());
  assert.equal((await response.json() as { status: string }).status, 'published');
  return { ok: true, detail: 'Added and removed recipients, then published through the UI; changes persisted after reload', removeTargetVisible: true };
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
	assert(await recordDailyAttendanceViaApi(page, base, classId, studentId, undefined, {
		date: isoDay(1),
		attendanceByStudent: studentId ? { [studentId]: 'present' } : {},
	}), 'Partial attendance fixture failed');
	assert(await recordDailyAttendanceViaApi(page, base, classId, null, undefined, {
		date: isoDay(2),
		attendanceByStudent: {},
	}), 'Unmarked attendance fixture failed');
}

export async function recordAttendanceForToday(
  journey: UiJourney,
  classId: string,
): Promise<string | null> {
  const { page, base } = journey.ctx;
  const studentId = journey.entities.studentId;
  assert(studentId, 'Required attendance student missing');
  await ensureDailyAttendanceMode(journey.ctx, classId, { force: true });
  assert(await ensureDailyAttendanceViaApi(page, base, classId, journey.entities.staffId), 'Daily attendance configuration failed');
  const today = new Date().toISOString().slice(0, 10);
  const dayId = `${classId}:${today}`;
  const path = `/classes/${classId}/attendance/${encodeURIComponent(dayId)}`;
  await gotoApp(journey, path);
  await waitForPageQuery(page);
  const markAll = page.locator('aside[aria-label]').getByRole('button', { name: /mark all present|tout marquer présent|marquer tous présents|tous présents/i });
  const bulk = await uiCommand(page, '/commands/record-class-daily-attendance', () => markAll.click());
  const bulkRecords = await bulk.json() as Array<{attendanceId:string;studentId:string;status:string}>;
  const attendanceId = bulkRecords[0]?.attendanceId;
  assert(attendanceId, 'Daily attendance occurrence missing');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForPageQuery(page);
  const readRecords = async () => {
    const response = await apiFetch(page, base, '/core/entities/attendance/list', { method: 'POST', data: { attendanceId } });
    assert(response.ok());
    return await response.json() as Array<{ studentId: string; status: string; date: string }>;
  };
  const recorded = await readRecords();
  assert(recorded.length >= 2 && bulkRecords.length > 0, 'Required enrolled attendance roster missing');
  for (const row of bulkRecords) assert.equal(recorded.find(saved => saved.studentId === row.studentId)?.status, 'present', 'Bulk-marked students must persist as present');
  const nextStatus = recorded.find(row => row.studentId === studentId)?.status === 'absent' ? 'late' : 'absent';
  assert(await openUrlModal(page, path, 'record-attendance', { base, target: studentId }));
  await page.getByRole('dialog').getByTestId('attendance-status-select').click();
  await page.getByTestId(`attendance-status-${nextStatus}`).click();
  await uiCommand(page, '/commands/record-daily-attendance', () => page.getByTestId('form-modal-submit').click());
  await waitForMutationDialog(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForPageQuery(page);
  assert.equal((await readRecords()).find(row => row.studentId === studentId)?.status, nextStatus, 'Edited daily attendance must persist');
  await recordCompletionFilterFixtureDays(page, base, classId, studentId);
  return dayId;
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
