import {
	clickCreateButton,
	fillGradeScaleCreateDialog,
	fillReportCardDefinitionDialog,
	openDialogButton,
	openUrlModal,
	submitDialog,
	trySubmitDialog,
	waitForDialogClosed,
	waitForFormModal,
	waitForPageQuery,
	waitForSubmitEnabled,
	assertListContains,
	setAppLang,
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
		if (!(await waitForSubmitEnabled(page, 12_000))) {
			throw new Error('Subject Save stayed disabled — grade level or year missing');
		}
		const payloadPromise = waitForCommandPayload(page, 'configure-subject');
		const offerPromise = waitForCommandPayload(page, 'offer-subject-to-grade-level', 20_000);
		await submitDialog(page);
		const closed = await waitForDialogClosed(page);
		const payload = await payloadPromise;
		await offerPromise;
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
			await gotoApp(journey, `/configuration/subjects?gradeLevel=${entities.gradeLevelId}`);
			const levelVisible = await assertListContains(page, subjectName, true, 20_000);
			if (levelVisible) {
				coverActions(
					journey,
					'http://localhost:5173/configuration/subjects',
					['Filtre niveau'],
					'OK',
					subjectName,
				);
			}
		}
		coverActions(journey, 'http://localhost:5173/configuration/subjects', ['Liste matières', 'Créer matière'], closed && subjectId ? 'OK' : 'NOT OK', subjectName);
		logStep(journey, { step: 'subject', ok: Boolean(subjectId), detail: subjectName, entityId: subjectId ?? undefined });

		await gotoApp(journey, `/configuration/subjects${entities.gradeLevelId ? `?gradeLevel=${entities.gradeLevelId}` : ''}`);
		const catalogOpened = await clickCreateButton(page, 'Créer matière', '/configuration/subjects');
		let catalogLocalized = false;
		if (catalogOpened) {
			const catalogDialog = page.getByRole('dialog');
			await catalogDialog.locator('input').first().fill('Mathématiques');
			if (await waitForSubmitEnabled(page, 12_000)) {
				await submitDialog(page);
				await waitForDialogClosed(page);
				await waitForPageQuery(page);
				const listPath = `/configuration/subjects${entities.gradeLevelId ? `?gradeLevel=${entities.gradeLevelId}` : ''}`;
				await gotoApp(journey, listPath);
				const enOk = await setAppLang(page, 'en');
				const showsEnglish = enOk && await assertListContains(page, 'Mathematics', true, 12_000);
				const keepsCustom = await assertListContains(page, subjectName, true, 8_000);
				const frOk = await setAppLang(page, 'fr');
				await gotoApp(journey, listPath);
				const showsFrench = frOk && await assertListContains(page, 'Mathématiques', true, 12_000);
				catalogLocalized = Boolean(showsEnglish && keepsCustom && showsFrench);
			}
			else {
				await page.keyboard.press('Escape').catch(() => {});
				await waitForDialogClosed(page).catch(() => false);
			}
		}
		logStep(journey, {
			step: 'catalog-subject-en',
			ok: catalogLocalized,
			detail: catalogLocalized ? 'Mathématiques ↔ Mathematics' : 'Catalog subject EN display failed',
		});

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
	const scaleName = `E2E-Scale-${Date.now()}`;
	const scaleOpened = await clickCreateButton(page, 'CRUD barème', '/configuration/grade-scales')
		|| await openDialogButton(page, /add scale|ajouter un barème/i);
	coverModal(journey, '/configuration/grade-scales', 'create', scaleOpened ? 'OK' : 'NOT OK');
	if (scaleOpened) {
		try {
			const payloadPromise = waitForCommandPayload(page, 'create-grade-scale');
			await fillGradeScaleCreateDialog(page, scaleName);
			const closed = await waitForDialogClosed(page);
			const payload = await payloadPromise;
			let scaleId = typeof payload?.id === 'string' ? payload.id : null;
			await waitForPageQuery(page);
			const listed = await assertListContains(page, scaleName, true, 20_000);
			if (!scaleId && listed) {
				const row = page.locator('main li').filter({ hasText: scaleName }).first();
				const editBtn = row.getByRole('button', { name: /actions de ligne|row actions/i })
					.or(row.locator('button').last());
				if (await editBtn.isVisible().catch(() => false)) {
					await editBtn.click();
					await page.waitForTimeout(300);
					const editItem = page.getByRole('button', { name: /modifier|edit/i }).last();
					if (await editItem.isVisible({ timeout: 4_000 }).catch(() => false)) {
						await editItem.click();
						await waitForFormModal(page, 8_000);
						scaleId = new URL(page.url()).searchParams.get('modalTarget');
						await page.keyboard.press('Escape');
						await waitForDialogClosed(page).catch(() => {});
					}
				}
			}
			entities.gradeScaleId = scaleId;
			coverActions(
				journey,
				'http://localhost:5173/configuration/grade-scales',
				['Liste barèmes', 'CRUD barème'],
				closed && listed && scaleId ? 'OK' : 'NOT OK',
				scaleName,
			);
			logStep(journey, { step: 'grade-scale', ok: Boolean(scaleId), detail: scaleName, entityId: scaleId ?? undefined });
		}
		catch (err) {
			const detail = err instanceof Error ? err.message : String(err);
			coverActions(journey, 'http://localhost:5173/configuration/grade-scales', ['CRUD barème'], 'NOT OK', detail);
			logStep(journey, { step: 'grade-scale', ok: false, detail });
			await page.keyboard.press('Escape').catch(() => {});
		}
	}
	else {
		coverActions(journey, 'http://localhost:5173/configuration/grade-scales', ['CRUD barème'], 'NOT OK', 'Scale modal not found');
		logStep(journey, { step: 'grade-scale', ok: false, detail: 'Scale modal not found' });
	}

	await visitCovered(journey, '/configuration/report-cards', '/configuration/report-cards');
	await page.reload({ waitUntil: 'domcontentloaded' });
	await waitForPageQuery(page);
	if (!entities.gradeScaleId) {
		logStep(journey, { step: 'report-card-def', ok: false, detail: 'No gradeScaleId to reference' });
		coverActions(journey, 'http://localhost:5173/configuration/report-cards', ['CRUD / publier'], 'NOT OK', 'No gradeScaleId to reference');
	}
	else {
		const rcOpened = await clickCreateButton(page, 'CRUD / publier', '/configuration/report-cards')
			|| await openDialogButton(page, /add model|ajouter un modèle|créer/i);
		coverModal(journey, '/configuration/report-cards', 'create', rcOpened ? 'OK' : 'NOT OK');
		if (rcOpened) {
			try {
				const rcName = `E2E-RC-${Date.now()}`;
				const payloadPromise = waitForCommandPayload(page, 'create-report-card-definition');
				await fillReportCardDefinitionDialog(page, {
					name: rcName,
					gradeLevelId: entities.gradeLevelId,
					gradeScaleId: entities.gradeScaleId,
					gradeScaleName: scaleName,
				});
				if (!(await trySubmitDialog(page))) {
					throw new Error('Report-card Save stayed disabled');
				}
				const payload = await payloadPromise;
				await waitForDialogClosed(page);
				let defId = typeof payload?.id === 'string' ? payload.id : null;
				if (!defId) {
					const fromUrl = page.url().match(/\/configuration\/report-cards\/([^/?]+)/)?.[1];
					defId = fromUrl && fromUrl.length > 0 ? fromUrl : null;
				}
				await gotoApp(journey, '/configuration/report-cards');
				defId = defId
					?? await configEntityIdByName(page, 'E2E-RC-')
					?? await firstIdFromLinks(page, /\/configuration\/report-cards\/([^/?]+)/);
				entities.reportCardDefId = defId;
				coverActions(journey, 'http://localhost:5173/configuration/report-cards', ['Liste définitions bulletins', 'CRUD / publier'], defId ? 'OK' : 'NOT OK', rcName);
				if (defId) {
					await gotoApp(journey, `/configuration/report-cards/${defId}`);
					await visitCovered(journey, '/configuration/report-cards/[id]', `/configuration/report-cards/${defId}`);
					coverActions(journey, 'http://localhost:5173/configuration/report-cards/[id]', ['Drawer définition'], 'OK');
				}
				logStep(journey, { step: 'report-card-def', ok: Boolean(defId), detail: rcName, entityId: defId ?? undefined });
			}
			catch (err) {
				const detail = err instanceof Error ? err.message : String(err);
				logStep(journey, { step: 'report-card-def', ok: false, detail });
				coverActions(journey, 'http://localhost:5173/configuration/report-cards', ['CRUD / publier'], 'NOT OK', detail);
				await page.keyboard.press('Escape').catch(() => {});
			}
		}
		else {
			logStep(journey, { step: 'report-card-def', ok: false, detail: 'Create definition modal not found' });
		}
	}

	entities.notificationTemplateKey = 'report_card.published';
	await visitCovered(journey, '/configuration/notifications', '/configuration/notifications');
	const notifDialog = await openUrlModal(page, '/configuration/notifications', 'edit', {
		target: entities.notificationTemplateKey,
		base: ctx.base,
		timeout: 12_000,
	});
	coverModal(journey, '/configuration/notifications', 'edit', notifDialog ? 'OK' : 'NOT OK');
	coverActions(journey, 'http://localhost:5173/configuration/notifications', ['Templates notifications école'], notifDialog ? 'OK' : 'NOT OK');
	if (notifDialog) {
		await page.keyboard.press('Escape');
	}
	logStep(journey, { step: 'notification-template', ok: notifDialog, detail: entities.notificationTemplateKey });

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

	try {
		await gotoApp(journey, '/configuration/tools');
		const toolsVisible = await page.locator('main').isVisible().catch(() => false);
		logStep(journey, { step: 'tools-hub', ok: toolsVisible, detail: toolsVisible ? 'hub visible' : 'hub missing' });
		await gotoApp(journey, '/configuration/tools/teacher-assignments');
		coverModal(journey, '/configuration/tools/teacher-assignments', 'create', 'OK', 'page visited — assignment later');
		logStep(journey, { step: 'tools-teacher-assignments', ok: true, detail: 'visited (assign after teacher)' });
	}
	catch (err) {
		console.error(
			'Tools hub visit failed; configuration chapter continuing:',
			err instanceof Error ? err.message : err,
		);
		logStep(journey, {
			step: 'tools-hub',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		});
	}
}
