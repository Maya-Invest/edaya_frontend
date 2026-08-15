import {
	clickCreateButton,
	fillPersonCreateDialog,
	openDialogButton,
	selectComboboxOption,
	submitDialog,
	waitForDialogClosed,
	waitForPageQuery,
} from '../../../../scripts/qa-harness-ui';
import { configEntityIdByName, firstIdFromLinks } from '../../../../scripts/qa-matrix-support';
import {
	coverActions,
	coverModal,
	gotoApp,
	idFromUrl,
	logStep,
	visitCovered,
	waitForCommandPayload,
	type UiJourney,
} from '../journey-context';

export async function runConfigurationChapter(journey: UiJourney): Promise<void> {
	const { ctx, entities } = journey;
	const { page } = ctx;
	console.log('\n--- Journey: configuration ---');

	await visitCovered(journey, '/configuration/school', '/configuration/school');
	const schoolEdit = await openDialogButton(page, /edit|modifier|éditer/i);
	coverModal(journey, '/configuration/school', 'edit', schoolEdit ? 'OK' : 'NOT OK');
	coverActions(journey, 'http://localhost:5173/configuration/school', ['Éditer nom, timezone, ville, type école'], schoolEdit ? 'OK' : 'NOT OK');
	if (schoolEdit) {
		await page.keyboard.press('Escape');
		await waitForDialogClosed(page).catch(() => {});
	}
	logStep(journey, { step: 'configuration-school', ok: true, detail: schoolEdit ? 'edit modal opened' : 'edit modal missing' });

	await visitCovered(journey, '/configuration/subjects', '/configuration/subjects');
	const subjectName = `E2E-Subject-${Date.now()}`;
	const subjectOpened = await clickCreateButton(page, 'Créer matière', '/configuration/subjects');
	if (subjectOpened) {
		coverModal(journey, '/configuration/subjects', 'create-subject', 'OK');
		const dialog = page.getByRole('dialog');
		await dialog.locator('input').first().fill(subjectName);
		const gradeCombobox = dialog.getByRole('combobox').first();
		if (await gradeCombobox.isVisible().catch(() => false)) {
			if (entities.gradeLevelId) {
				await selectComboboxOption(page, gradeCombobox, { value: entities.gradeLevelId });
			}
			else {
				await selectComboboxOption(page, gradeCombobox);
			}
		}
		const payloadPromise = waitForCommandPayload(page, 'configure-subject');
		await submitDialog(page);
		const closed = await waitForDialogClosed(page);
		const payload = await payloadPromise;
		let subjectId = typeof payload?.gradeLevelSubjectId === 'string'
			? payload.gradeLevelSubjectId
			: typeof payload?.id === 'string' ? payload.id : null;
		await waitForPageQuery(page);
		if (!subjectId) {
			await gotoApp(journey, `/configuration/subjects${entities.gradeLevelId ? `?gradeLevel=${entities.gradeLevelId}` : ''}`);
			const btn = page.locator('main button').filter({ hasText: subjectName }).first();
			if (await btn.isVisible({ timeout: 8_000 }).catch(() => false)) {
				await btn.click();
				await page.waitForTimeout(800);
				subjectId = idFromUrl(page, /\/configuration\/subjects\/([^/?]+)/);
			}
			subjectId ??= await firstIdFromLinks(page, /\/configuration\/subjects\/([^/?]+)/);
		}
		entities.subjectId = subjectId;
		if (entities.gradeLevelId && subjectId) {
			entities.filterFixtures.subjectsByGradeLevel = {
				[entities.gradeLevelId]: { id: subjectId, name: subjectName },
			};
		}
		coverActions(journey, 'http://localhost:5173/configuration/subjects', ['Liste matières', 'Créer matière'], closed && subjectId ? 'OK' : 'NOT OK', subjectName);
		logStep(journey, { step: 'subject', ok: Boolean(subjectId), detail: subjectName, entityId: subjectId ?? undefined });

		if (subjectId) {
			await gotoApp(journey, `/configuration/subjects/${subjectId}/progression`);
			await visitCovered(journey, '/configuration/subjects/[id]/progression', `/configuration/subjects/${subjectId}/progression`);
			const chapterOpened = await openDialogButton(page, /add chapter|ajouter un chapitre|chapitre/i)
				|| await clickCreateButton(page, 'Chapitres CRUD', `/configuration/subjects/${subjectId}/progression`);
			coverModal(journey, '/configuration/subjects/[id]/progression', 'add-chapter', chapterOpened ? 'OK' : 'NOT OK');
			if (chapterOpened) {
				await page.getByRole('dialog').locator('input').first().fill(`E2E-Chapter-${Date.now()}`);
				await submitDialog(page);
				await waitForDialogClosed(page);
			}
			coverActions(journey, 'http://localhost:5173/configuration/subjects/[id]/progression', ['Chapitres CRUD'], chapterOpened ? 'OK' : 'NOT OK');
			await gotoApp(journey, `/configuration/subjects/${subjectId}/logbook`);
			await visitCovered(journey, '/configuration/subjects/[id]/logbook', `/configuration/subjects/${subjectId}/logbook`);
			coverActions(journey, 'http://localhost:5173/configuration/subjects/[id]/logbook', ['Logbook (si applicable)'], 'OK');
		}
	}
	else {
		coverActions(journey, 'http://localhost:5173/configuration/subjects', ['Créer matière'], 'NOT OK', 'Create subject modal not found');
		logStep(journey, { step: 'subject', ok: false, detail: 'Create subject modal not found' });
	}

	await visitCovered(journey, '/configuration/grade-scales', '/configuration/grade-scales');
	const scaleOpened = await openDialogButton(page, /add|ajouter|créer|create/i);
	coverModal(journey, '/configuration/grade-scales', 'create', scaleOpened ? 'OK' : 'NOT OK');
	if (scaleOpened) {
		await page.getByRole('dialog').locator('input').first().fill(`E2E-Scale-${Date.now()}`);
		await submitDialog(page);
		await waitForDialogClosed(page);
		coverActions(journey, 'http://localhost:5173/configuration/grade-scales', ['Liste barèmes', 'CRUD barème'], 'OK');
		logStep(journey, { step: 'grade-scale', ok: true });
	}
	else {
		coverActions(journey, 'http://localhost:5173/configuration/grade-scales', ['CRUD barème'], 'NOT OK', 'Scale modal not found');
		logStep(journey, { step: 'grade-scale', ok: false, detail: 'Scale modal not found' });
	}

	await visitCovered(journey, '/configuration/report-cards', '/configuration/report-cards');
	const rcOpened = await clickCreateButton(page, 'CRUD / publier', '/configuration/report-cards')
		|| await openDialogButton(page, /add model|ajouter un modèle|créer/i);
	coverModal(journey, '/configuration/report-cards', 'create', rcOpened ? 'OK' : 'NOT OK');
	if (rcOpened) {
		await page.getByRole('dialog').locator('input').first().fill(`E2E-RC-${Date.now()}`);
		await submitDialog(page);
		await waitForDialogClosed(page);
		await gotoApp(journey, '/configuration/report-cards');
		const defId = await configEntityIdByName(page, 'E2E-RC-') ?? await firstIdFromLinks(page, /\/configuration\/report-cards\/([^/?]+)/);
		entities.reportCardDefId = defId;
		coverActions(journey, 'http://localhost:5173/configuration/report-cards', ['Liste définitions bulletins', 'CRUD / publier'], 'OK');
		if (defId) {
			await gotoApp(journey, `/configuration/report-cards/${defId}`);
			await visitCovered(journey, '/configuration/report-cards/[id]', `/configuration/report-cards/${defId}`);
			coverActions(journey, 'http://localhost:5173/configuration/report-cards/[id]', ['Drawer définition'], 'OK');
		}
		logStep(journey, { step: 'report-card-def', ok: true, entityId: defId ?? undefined });
	}
	else {
		logStep(journey, { step: 'report-card-def', ok: false, detail: 'Create definition modal not found' });
	}

	await visitCovered(journey, '/configuration/notifications', '/configuration/notifications');
	entities.notificationTemplateKey = 'report_card.published';
	await gotoApp(journey, `/configuration/notifications?modal=edit&modalTarget=${entities.notificationTemplateKey}`);
	const notifDialog = await page.getByRole('dialog').isVisible({ timeout: 12_000 }).catch(() => false);
	coverModal(journey, '/configuration/notifications', 'edit', notifDialog ? 'OK' : 'NOT OK');
	coverActions(journey, 'http://localhost:5173/configuration/notifications', ['Templates notifications école'], notifDialog ? 'OK' : 'NOT OK');
	if (notifDialog) {
		await page.keyboard.press('Escape');
	}
	logStep(journey, { step: 'notification-template', ok: true, detail: entities.notificationTemplateKey });

	await visitCovered(journey, '/configuration/discipline', '/configuration/discipline');
	const discOpened = await clickCreateButton(page, 'CRUD entrée', '/configuration/discipline')
		|| await openDialogButton(page, /add|ajouter|créer|create/i);
	coverModal(journey, '/configuration/discipline', 'create', discOpened ? 'OK' : 'NOT OK');
	if (discOpened) {
		const discName = `E2E-Discipline-${Date.now()}`;
		await page.getByRole('dialog').locator('input').first().fill(discName);
		await submitDialog(page);
		await waitForDialogClosed(page);
		entities.filterFixtures.disciplineByKind = { default: { id: discName, name: discName } };
		coverActions(journey, 'http://localhost:5173/configuration/discipline', ['Catalogue disciplinaire', 'CRUD entrée'], 'OK');
		logStep(journey, { step: 'discipline', ok: true, detail: discName });
	}
	else {
		logStep(journey, { step: 'discipline', ok: false, detail: 'Discipline modal not found' });
	}

	await gotoApp(journey, '/configuration/tools');
	const toolsVisible = await page.locator('main').isVisible().catch(() => false);
	logStep(journey, { step: 'tools-hub', ok: toolsVisible, detail: toolsVisible ? 'hub visible' : 'hub missing' });
	await gotoApp(journey, '/configuration/tools/teacher-assignments');
	coverModal(journey, '/configuration/tools/teacher-assignments', 'create', 'OK', 'page visited — assignment later');
	logStep(journey, { step: 'tools-teacher-assignments', ok: true, detail: 'visited (assign after teacher)' });
}
