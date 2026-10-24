import type { FilterFixtures, MatrixEntities } from '../../../scripts/qa-matrix-support';
/**
 * Provisioned filter + modal entity setup — creates fixtures before matrix filter tests.
 */
import type { DemoContext } from '../demo-dry-run/support/types';
import type { SetupStepResult } from './journey-context';
import {
	assertListContains,
	clickCreateButton,
	dismissPageError,
	fillClassCreateDialog,
	fillDateInputsInRange,
	fillGradeLevelCreateDialog,
	fillStudentCreateDialog,
	openDialogButton,
	selectComboboxOption,
	submitDialog,
	waitForDialogClosed,
	waitForPageQuery,
	waitForResolvedAcademicYearId,
} from '../../../scripts/qa-harness-ui';
import {
	configEntityIdByName,
	firstIdFromLinks,
	waitForAppShell,

} from '../../../scripts/qa-matrix-support';
import { ensureDailyAttendanceMode } from '../demo-dry-run/support/setup';

async function gotoAppPage(ctx: DemoContext, routePath: string): Promise<void> {
	await ctx.page.goto(`${ctx.base}${routePath}`, { waitUntil: 'domcontentloaded' });
	await waitForAppShell(ctx.page);
}

export async function setupClassDailyAttendance(
	ctx: DemoContext,
	classId: string | null,
): Promise<SetupStepResult> {
	if (!classId) {
		return { step: 'class-daily-attendance', ok: false, detail: 'No classId for daily attendance mode' };
	}
	try {
		const ok = await ensureDailyAttendanceMode(ctx, classId, { force: true });
		return ok
			? { step: 'class-daily-attendance', ok: true, detail: `Daily mode on ${classId}` }
			: { step: 'class-daily-attendance', ok: false, detail: 'Failed to set daily attendance mode' };
	}
	catch (err) {
		return {
			step: 'class-daily-attendance',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		};
	}
}

export async function setupCalendarEvent(
	ctx: DemoContext,
	entities: MatrixEntities,
	type: 'holiday' | 'ceremony' = 'holiday',
	title?: string,
): Promise<SetupStepResult> {
	const { page } = ctx;
	const eventTitle = title ?? `E2E-Calendar-${type}-${Date.now()}`;
	try {
		await gotoAppPage(ctx, '/school/calendar?modal=create');
		await waitForPageQuery(page);
		await dismissPageError(page);

		const dialog = page.getByRole('dialog');
		if (!(await dialog.isVisible({ timeout: 8_000 }).catch(() => false))) {
			const opened = await openDialogButton(page, /add event|ajouter un événement/i);
			if (!opened) {
				return { step: 'calendar-event', ok: false, detail: 'Calendar create modal not found' };
			}
		}

		await dialog.locator('input').first().fill(eventTitle);
		await fillDateInputsInRange(dialog);
		const typeSelect = dialog.locator('select').first();
		if (await typeSelect.isVisible().catch(() => false)) {
			await typeSelect.selectOption(type).catch(() => {});
		}
		await submitDialog(page);
		if (!(await waitForDialogClosed(page))) {
			return { step: 'calendar-event', ok: false, detail: 'Calendar modal still open' };
		}
		await waitForPageQuery(page);

		await gotoAppPage(ctx, '/school/calendar');
		await waitForPageQuery(page);

		const row = page.locator('main').getByText(eventTitle, { exact: false }).first();
		if (await row.isVisible({ timeout: 8_000 }).catch(() => false)) {
			const editBtn = row.locator('xpath=ancestor::li[1]').getByRole('button', { name: /edit|modifier/i }).first();
			if (await editBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
				await editBtn.click();
				await page.waitForTimeout(500);
				const match = page.url().match(/modalTarget=([^&]+)/);
				if (match?.[1]) {
					entities.calendarEventId = decodeURIComponent(match[1]);
				}
			}
		}

		const eventId = entities.calendarEventId
			?? await firstIdFromLinks(page, /\/school\/calendar\/([^/?]+)/);
		if (eventId) {
			entities.calendarEventId = eventId;
			entities.filterFixtures.calendarByType ??= {};
			entities.filterFixtures.calendarByType[type] = { id: eventId, title: eventTitle };
		}

		return {
			step: 'calendar-event',
			ok: true,
			detail: eventTitle,
			entityId: eventId ?? undefined,
		};
	}
	catch (err) {
		return {
			step: 'calendar-event',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		};
	}
}

export async function setupAnnouncement(
	ctx: DemoContext,
	entities: MatrixEntities,
	status: 'draft' | 'published' = 'draft',
): Promise<SetupStepResult> {
	const { page } = ctx;
	const title = `E2E-Announcement-${status}-${Date.now()}`;
	try {
		await gotoAppPage(ctx, '/school/announcements?modal=create');
		await waitForPageQuery(page);
		await dismissPageError(page);

		if (!(await page.getByRole('dialog').isVisible({ timeout: 8_000 }).catch(() => false))) {
			const opened = await clickCreateButton(page, 'Créer annonce', '/school/announcements');
			if (!opened) {
				return { step: 'announcement', ok: false, detail: 'Announcement create modal not found' };
			}
		}

		const dialog = page.getByRole('dialog');
		await dialog.locator('input').first().fill(title);
		const textarea = dialog.locator('textarea').first();
		if (await textarea.isVisible().catch(() => false)) {
			await textarea.fill('E2E announcement body');
		}
		await submitDialog(page);
		if (!(await waitForDialogClosed(page))) {
			return { step: 'announcement', ok: false, detail: 'Announcement modal still open' };
		}
		await waitForPageQuery(page);

		await gotoAppPage(ctx, '/school/announcements');
		const announcementId = await firstIdFromLinks(page, /\/school\/announcements\/([^/?]+)/);
		if (announcementId) {
			entities.announcementId = entities.announcementId ?? announcementId;
			entities.filterFixtures.announcementsByStatus ??= {};
			entities.filterFixtures.announcementsByStatus[status] = { id: announcementId, title };
		}

		return { step: 'announcement', ok: true, detail: title, entityId: announcementId ?? undefined };
	}
	catch (err) {
		return {
			step: 'announcement',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		};
	}
}

export async function setupSchoolEvent(
	ctx: DemoContext,
	entities: MatrixEntities,
): Promise<SetupStepResult> {
	const { page } = ctx;
	const title = `E2E-Incident-${Date.now()}`;
	try {
		await gotoAppPage(ctx, '/school/events');
		await waitForPageQuery(page);
		await dismissPageError(page);

		const opened = await openDialogButton(page, /add incident|ajouter un incident/i);
		if (!opened) {
			return { step: 'school-event', ok: false, detail: 'Incident create modal not found' };
		}

		const dialog = page.getByRole('dialog');
		const studentCombo = dialog.getByRole('combobox').first();
		if (await studentCombo.isVisible().catch(() => false)) {
			await studentCombo.click();
			await page.getByRole('option').first().click({ timeout: 5_000 }).catch(() => {});
		}
		await dialog.locator('input').first().fill(title);
		const textarea = dialog.locator('textarea').first();
		if (await textarea.isVisible().catch(() => false)) {
			await textarea.fill('E2E incident description');
		}
		const submit = dialog.getByTestId('form-modal-submit')
			.or(dialog.getByRole('button', { name: /enregistrer|save/i }))
			.last();
		if (await submit.isEnabled().catch(() => false)) {
			await submit.click();
			await page.waitForTimeout(2_000);
		}

		await gotoAppPage(ctx, '/school/events');
		const eventId = await firstIdFromLinks(page, /\/school\/events\/([^/?]+)/);
		if (eventId) {
			entities.eventId = eventId;
		}

		return { step: 'school-event', ok: true, detail: title, entityId: eventId ?? undefined };
	}
	catch (err) {
		return {
			step: 'school-event',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		};
	}
}

export function seedNotificationTemplateKey(entities: MatrixEntities): SetupStepResult {
	entities.notificationTemplateKey = 'report_card.published';
	return {
		step: 'notification-template-key',
		ok: true,
		detail: entities.notificationTemplateKey,
	};
}

export async function setStudentStatus(
	ctx: DemoContext,
	studentId: string,
	status: 'inactive' | 'archived',
): Promise<boolean> {
	const { page, base } = ctx;
	await page.goto(`${base}/school/students/${studentId}/profile`, { waitUntil: 'domcontentloaded' });
	await waitForAppShell(page);
	await waitForPageQuery(page);

	const select = page.locator('select').filter({ has: page.locator('option[value="inactive"]') }).last();
	await select.waitFor({ state: 'attached', timeout: 20_000 }).catch(() => {});
	await select.scrollIntoViewIfNeeded().catch(() => {});
	const mutation = page.waitForResponse(
		res => res.request().method() === 'POST' && res.url().includes('/core/commands/update-student-status'),
		{ timeout: 20_000 },
	).catch(() => null);
	try {
		await select.selectOption(status);
		await select.evaluate((el, next) => {
			if (!(el instanceof HTMLSelectElement)) {
				return;
			}
			el.value = next;
			el.dispatchEvent(new Event('input', { bubbles: true }));
			el.dispatchEvent(new Event('change', { bubbles: true }));
		}, status);
	}
	catch {
		return false;
	}
	await mutation;
	await waitForPageQuery(page);
	await page.waitForTimeout(1_000);
	return true;
}

async function createFilterStudent(ctx: DemoContext, lastName: string): Promise<string | null> {
	const { page } = ctx;
	await gotoAppPage(ctx, '/school/students');
	await waitForPageQuery(page);
	await dismissPageError(page);

	const opened = await openDialogButton(page, /add student|ajouter un élève/i, 30_000);
	if (!opened) {
		return null;
	}

	const registerResponse = page.waitForResponse(
		res => res.url().includes('/core/commands/register-student') && res.request().method() === 'POST',
		{ timeout: 45_000 },
	);

	await fillStudentCreateDialog(page, { firstName: 'E2E', lastName });
	if (!(await waitForDialogClosed(page))) {
		return null;
	}

	let studentId: string | null = null;
	try {
		const response = await registerResponse;
		const postData = response.request().postData();
		if (postData) {
			const parsed = JSON.parse(postData) as { id?: string };
			studentId = parsed.id ?? null;
		}
	}
	catch {
		// fixture lastName still usable for filter assertions
	}

	await waitForPageQuery(page);
	return studentId;
}

export async function setupFilterStudents(
	ctx: DemoContext,
	entities: MatrixEntities,
): Promise<SetupStepResult> {
	const ts = Date.now();
	const searchToken = `E2E-Search-${ts}`;
	const classLastName = `E2E-Class-${ts}`;
	const activeLastName = `E2E-Active-${ts}`;
	const inactiveLastName = `E2E-Inactive-${ts}`;
	const archivedLastName = `E2E-Archived-${ts}`;
	const classId = entities.classId;

	try {
		entities.filterFixtures.searchToken = searchToken;
		entities.filterFixtures.studentsByStatus = {};
		entities.filterFixtures.studentsByClass = {};

		const searchStudentId = await createFilterStudent(ctx, searchToken);
		if (!searchStudentId) {
			return { step: 'filter-students', ok: false, detail: 'Failed to create search student' };
		}

		const classStudentId = await createFilterStudent(ctx, classLastName);
		if (!classStudentId) {
			return { step: 'filter-students', ok: false, detail: 'Failed to create class-filter student' };
		}
		if (classId) {
			entities.filterFixtures.studentsByClass[classId] = {
				id: classStudentId,
				lastName: classLastName,
				classId,
			};
		}

		const activeId = await createFilterStudent(ctx, activeLastName);
		if (!activeId) {
			return { step: 'filter-students', ok: false, detail: 'Failed to create active student' };
		}
		entities.filterFixtures.studentsByStatus.active = { id: activeId, lastName: activeLastName };

		const inactiveId = await createFilterStudent(ctx, inactiveLastName);
		if (!inactiveId) {
			return { step: 'filter-students', ok: false, detail: 'Failed to create inactive student' };
		}
		if (!(await setStudentStatus(ctx, inactiveId, 'inactive'))) {
			return { step: 'filter-students', ok: false, detail: 'Failed to set student inactive' };
		}
		entities.filterFixtures.studentsByStatus.inactive = { id: inactiveId, lastName: inactiveLastName };

		const archivedId = await createFilterStudent(ctx, archivedLastName);
		if (!archivedId) {
			return { step: 'filter-students', ok: false, detail: 'Failed to create archived student' };
		}
		if (!(await setStudentStatus(ctx, archivedId, 'archived'))) {
			return { step: 'filter-students', ok: false, detail: 'Failed to set student archived' };
		}
		entities.filterFixtures.studentsByStatus.archived = { id: archivedId, lastName: archivedLastName };

		return {
			step: 'filter-students',
			ok: true,
			detail: `search=${searchToken}, class=${classLastName}, statuses=3`,
		};
	}
	catch (err) {
		return {
			step: 'filter-students',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		};
	}
}

export async function setupSecondClass(
	ctx: DemoContext,
	entities: MatrixEntities,
): Promise<SetupStepResult> {
	const { page } = ctx;
	try {
		await waitForResolvedAcademicYearId(page);
		await gotoAppPage(ctx, '/configuration/structure/classes');
		await waitForPageQuery(page);

		const className = `E2E-6B-${Date.now()}`;
		const opened = await openDialogButton(page, /ajouter une classe|add class/i);
		if (!opened) {
			return { step: 'second-class', ok: false, detail: 'Second class modal not found' };
		}
		await fillClassCreateDialog(page, className);
		if (!(await waitForDialogClosed(page))) {
			return { step: 'second-class', ok: false, detail: 'Second class modal still open' };
		}

		await gotoAppPage(ctx, '/configuration/structure/classes');
		const entityId = await configEntityIdByName(page, className);
		if (entityId) {
			entities.secondClassId = entityId;
		}
		return { step: 'second-class', ok: true, detail: className, entityId: entityId ?? undefined };
	}
	catch (err) {
		return {
			step: 'second-class',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		};
	}
}

export async function setupFilterFees(ctx: DemoContext, entities: MatrixEntities): Promise<SetupStepResult> {
	const { page } = ctx;
	try {
		await gotoAppPage(ctx, '/finance/fees');
		await waitForPageQuery(page);
		await dismissPageError(page);

		const feeName = `E2E-Fee-${Date.now()}`;
		const opened = await openDialogButton(page, /add fee|ajouter un frais/i);
		if (!opened) {
			return { step: 'filter-fees', ok: false, detail: 'Fee create modal not found' };
		}
		const dialog = page.getByRole('dialog');
		await dialog.locator('input').first().fill(feeName);
		const amount = dialog.locator('input[type="number"]').first();
		if (await amount.isVisible().catch(() => false)) {
			await amount.fill('10000');
		}
		await submitDialog(page);
		if (!(await waitForDialogClosed(page))) {
			return { step: 'filter-fees', ok: false, detail: 'Fee modal still open' };
		}

		entities.filterFixtures.feesByCategory ??= {};
		entities.filterFixtures.feesByCategory.default = { id: feeName, name: feeName };

		return { step: 'filter-fees', ok: true, detail: feeName };
	}
	catch (err) {
		return {
			step: 'filter-fees',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		};
	}
}

export async function setupFilterSubjects(
	ctx: DemoContext,
	entities: MatrixEntities,
): Promise<SetupStepResult> {
	const { page } = ctx;
	const gradeLevelId = entities.gradeLevelId;
	if (!gradeLevelId) {
		return { step: 'filter-subjects', ok: false, detail: 'No gradeLevelId from tenant setup' };
	}

	try {
		await gotoAppPage(ctx, '/configuration/structure/subjects');
		await waitForPageQuery(page);

		const subjectName = `E2E-Subject-${Date.now()}`;
		const opened = await clickCreateButton(page, 'Créer matière', '/configuration/structure/subjects');
		if (!opened) {
			return { step: 'filter-subjects', ok: false, detail: 'Subject create modal not found' };
		}
		const dialog = page.getByRole('dialog');
		await dialog.locator('input').first().fill(subjectName);
		await dialog.getByRole('combobox', { name: /discipline/i }).selectOption({ index: 1 });

		const gradeCombobox = dialog.getByRole('combobox').first();
		if (await gradeCombobox.isVisible().catch(() => false)) {
			await selectComboboxOption(page, gradeCombobox, { value: gradeLevelId });
		}
		else {
			const gradeSelect = dialog.locator('select').first();
			if (await gradeSelect.isVisible().catch(() => false)) {
				await gradeSelect.selectOption(gradeLevelId).catch(() => gradeSelect.selectOption({ index: 0 }));
			}
		}

		const subjectCommandResponse = page.waitForResponse(
			res => res.request().method() === 'POST'
				&& res.url().includes('/core/commands/')
				&& res.url().includes('configure-subject'),
			{ timeout: 45_000 },
		);

		await submitDialog(page);
		if (!(await waitForDialogClosed(page))) {
			return { step: 'filter-subjects', ok: false, detail: 'Subject modal still open' };
		}

		let subjectId: string | null = null;
		try {
			const response = await subjectCommandResponse;
			const postData = response.request().postData();
			if (postData) {
				const parsed = JSON.parse(postData) as { id?: string };
				subjectId = parsed.id ?? null;
			}
		}
		catch {
			// fall through to list discovery
		}

		await waitForPageQuery(page);

		if (!subjectId) {
			await gotoAppPage(ctx, `/configuration/structure/subjects?gradeLevel=${gradeLevelId}`);
			await waitForPageQuery(page);

			const subjectButton = page.locator('main button').filter({ hasText: subjectName }).first();
			if (await subjectButton.isVisible({ timeout: 10_000 }).catch(() => false)) {
				await subjectButton.click();
				await page.waitForTimeout(800);
				subjectId = page.url().match(/\/configuration\/structure\/subjects\/([^/?]+)/)?.[1] ?? null;
			}
			if (!subjectId) {
				subjectId = await firstIdFromLinks(page, /\/configuration\/structure\/subjects\/([^/?]+)/);
			}
		}

		if (!subjectId) {
			return { step: 'filter-subjects', ok: false, detail: `Subject ${subjectName} created but id not resolved` };
		}

		entities.filterFixtures.subjectsByGradeLevel ??= {};
		entities.filterFixtures.subjectsByGradeLevel[gradeLevelId] = { id: subjectId, name: subjectName };
		entities.subjectId = subjectId;

		return { step: 'filter-subjects', ok: true, detail: `${subjectName} (${subjectId})` };
	}
	catch (err) {
		return {
			step: 'filter-subjects',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		};
	}
}

export async function setupFilterDiscipline(
	ctx: DemoContext,
	entities: MatrixEntities,
): Promise<SetupStepResult> {
	const { page } = ctx;
	try {
		await gotoAppPage(ctx, '/configuration/other/discipline');
		await waitForPageQuery(page);

		const name = `E2E-Discipline-${Date.now()}`;
		const opened = await clickCreateButton(page, 'CRUD entrée', '/configuration/other/discipline');
		if (!opened) {
			return { step: 'filter-discipline', ok: false, detail: 'Discipline create modal not found' };
		}
		const dialog = page.getByRole('dialog');
		await dialog.locator('input').first().fill(name);
		await submitDialog(page);
		if (!(await waitForDialogClosed(page))) {
			return { step: 'filter-discipline', ok: false, detail: 'Discipline modal still open' };
		}
		if (!(await assertListContains(page, name, true, 20_000))) {
			return { step: 'filter-discipline', ok: false, detail: `Created ${name} but it is not in the list` };
		}

		entities.filterFixtures.disciplineByKind ??= {};
		entities.filterFixtures.disciplineByKind.default = { id: name, name };

		return { step: 'filter-discipline', ok: true, detail: name };
	}
	catch (err) {
		return {
			step: 'filter-discipline',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		};
	}
}

export async function setupSecondGradeLevel(
	ctx: DemoContext,
	entities: MatrixEntities,
): Promise<SetupStepResult> {
	const { page } = ctx;
	try {
		await gotoAppPage(ctx, '/configuration/grade-levels');
		await waitForPageQuery(page);

		const name = `E2E-5eme-${Date.now()}`;
		const opened = await openDialogButton(page, /ajouter un niveau|add grade level/i);
		if (!opened) {
			return { step: 'second-grade-level', ok: false, detail: 'Second grade level modal not found' };
		}
		await fillGradeLevelCreateDialog(page, name);
		if (!(await waitForDialogClosed(page))) {
			return { step: 'second-grade-level', ok: false, detail: 'Grade level modal still open' };
		}

		await gotoAppPage(ctx, '/configuration/grade-levels');
		const entityId = await configEntityIdByName(page, name);
		if (entityId) {
			entities.secondGradeLevelId = entityId;
		}
		return { step: 'second-grade-level', ok: true, detail: name, entityId: entityId ?? undefined };
	}
	catch (err) {
		return {
			step: 'second-grade-level',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		};
	}
}

export async function runFilterEntitySetup(
	ctx: DemoContext,
	entities: MatrixEntities,
): Promise<SetupStepResult[]> {
	const steps: SetupStepResult[] = [];
	const classId = entities.classId ?? entities.configClassId;

	steps.push(await setupClassDailyAttendance(ctx, classId));
	steps.push(await setupFilterStudents(ctx, entities));
	steps.push(await setupSecondClass(ctx, entities));
	steps.push(await setupCalendarEvent(ctx, entities, 'holiday'));
	steps.push(await setupCalendarEvent(ctx, entities, 'ceremony', `E2E-Ceremony-${Date.now()}`));
	steps.push(await setupAnnouncement(ctx, entities, 'draft'));
	steps.push(await setupSchoolEvent(ctx, entities));
	steps.push(seedNotificationTemplateKey(entities));
	steps.push(await setupFilterFees(ctx, entities));
	steps.push(await setupSecondGradeLevel(ctx, entities));
	steps.push(await setupFilterSubjects(ctx, entities));
	steps.push(await setupFilterDiscipline(ctx, entities));

	return steps;
}

export function filterFixturesReady(fixtures: FilterFixtures, key: keyof FilterFixtures): boolean {
	const value = fixtures[key];
	if (!value)
		return false;
	if (typeof value === 'string')
		return value.length > 0;
	return Object.keys(value).length > 0;
}
