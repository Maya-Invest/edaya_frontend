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
	fillLabeledInput,
} from '../../../../scripts/qa-harness-ui';
import { configEntityIdByName, firstIdFromLinks } from '../../../../scripts/qa-matrix-support';
import {
	coverActions,
	coverCompletedModal,
	coverMutationActions,
	gotoApp,
	idFromUrl,
	logStep,
	runModalMutation,
	visitCovered,
	waitForCommandPayload,
	type UiJourney,
} from '../journey-context';
import { ensureNotificationTemplatesViaApi } from '../journey-api';

export async function runConfigurationChapter(journey: UiJourney): Promise<void> {
	const { ctx, entities } = journey;
	const { page } = ctx;
	console.log('\n--- Journey: configuration ---');

	await visitCovered(journey, '/configuration/school', '/configuration/school');
	const cityToken = `QA-City-${Date.now()}`;
	await runModalMutation(journey, {
		parentRoute: '/configuration/school',
		modal: 'edit',
		pathname: '/configuration/school',
		command: 'update-school-configuration',
		fill: async (current) => {
			await fillLabeledInput(current, /ville|city/i, cityToken);
		},
		visibleAfter: cityToken,
		listPath: '/configuration/school',
		actionPath: 'http://localhost:5173/configuration/school',
		actions: ['Éditer nom, timezone, ville, type école'],
	});
	logStep(journey, { step: 'configuration-school', ok: true, detail: cityToken });

	await visitCovered(journey, '/configuration/subjects', '/configuration/subjects');
	const subjectName = `E2E-Subject-${Date.now()}`;
	const subjectOpened = await clickCreateButton(page, 'Créer matière', '/configuration/subjects');
	if (subjectOpened) {
		const dialog = page.getByRole('dialog');
		await dialog.locator('input').first().fill(subjectName);
		if (!(await waitForSubmitEnabled(page, 12_000))) {
			coverCompletedModal(journey, '/configuration/subjects', 'create-subject', {
				opened: true,
				submitted: false,
				closed: false,
			}, 'Subject Save stayed disabled — grade level or year missing');
			throw new Error('Subject Save stayed disabled — grade level or year missing');
		}
		const payloadPromise = waitForCommandPayload(page, 'configure-subject');
		const offerPromise = waitForCommandPayload(page, 'offer-subject-to-grade-level', 20_000);
		await submitDialog(page);
		const closed = await waitForDialogClosed(page);
		const payload = await payloadPromise;
		const offeredSubject = await offerPromise;
		let subjectId = typeof offeredSubject?.id === 'string'
			? offeredSubject.id
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
		entities.subjectId = typeof payload?.id === 'string' ? payload.id : null;
		entities.configurationSubjectId = subjectId;
		coverCompletedModal(journey, '/configuration/subjects', 'create-subject', {
			opened: true,
			submitted: true,
			closed,
			postcondition: Boolean(subjectId),
		}, subjectName);
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
			const chapterName = `E2E-Chapter-${Date.now()}`;
			let chapterListed = false;
			if (chapterOpened) {
				await page.getByRole('dialog').locator('input').first().fill(chapterName);
				await submitDialog(page);
				const chapterClosed = await waitForDialogClosed(page);
				chapterListed = chapterClosed && await assertListContains(page, chapterName, true, 20_000);
				coverCompletedModal(journey, '/configuration/subjects/[id]/progression', 'add-chapter', {
					opened: true,
					submitted: true,
					closed: chapterClosed,
					postcondition: chapterListed,
				}, chapterName);
			}
			else {
				coverCompletedModal(journey, '/configuration/subjects/[id]/progression', 'add-chapter', {
					opened: false,
					submitted: false,
					closed: false,
				}, 'chapter modal not found');
			}
			coverMutationActions(
				journey,
				'http://localhost:5173/configuration/subjects/[id]/progression',
				['Chapitres CRUD'],
				{ exercised: chapterOpened, postcondition: chapterListed },
				chapterOpened ? chapterName : 'chapter modal not found',
			);
			await gotoApp(journey, `/configuration/subjects/${subjectId}/logbook`);
			await visitCovered(journey, '/configuration/subjects/[id]/logbook', `/configuration/subjects/${subjectId}/logbook`);
			coverActions(journey, 'http://localhost:5173/configuration/subjects/[id]/logbook', ['Redirection catalogue vers progression'], 'OK');
		}
	}
	else {
		coverCompletedModal(journey, '/configuration/subjects', 'create-subject', {
			opened: false,
			submitted: false,
			closed: false,
		}, 'Create subject modal not found');
		coverActions(journey, 'http://localhost:5173/configuration/subjects', ['Créer matière'], 'NOT OK', 'Create subject modal not found');
		logStep(journey, { step: 'subject', ok: false, detail: 'Create subject modal not found' });
	}

	await visitCovered(journey, '/configuration/other', '/configuration/other');
	const catalogNav = page.getByRole('navigation', { name: /autres configurations|other configurations/i });
	const catalogLinks = [
		catalogNav.getByRole('link', { name: /barèmes|grade scales/i }),
		catalogNav.getByRole('link', { name: /catalogue disciplinaire|disciplinary catalog/i }),
		catalogNav.getByRole('link', { name: /catégories de matières|subject categories/i }),
	];
	const catalogsVisible = (await Promise.all(catalogLinks.map(link => link.isVisible({ timeout: 8_000 }).catch(() => false))))
		.every(Boolean);
	coverActions(
		journey,
		'http://localhost:5173/configuration/other',
		['Liste des catalogues'],
		catalogsVisible ? 'OK' : 'NOT OK',
		catalogsVisible ? 'grade-scales, discipline, subject-categories' : 'Catalog list incomplete',
	);
	logStep(journey, { step: 'other-config', ok: catalogsVisible, detail: 'catalog list' });

	await visitCovered(journey, '/configuration/other/grade-scales', '/configuration/other/grade-scales');
	const scaleName = `E2E-Scale-${Date.now()}`;
	const scaleOpened = await clickCreateButton(page, 'CRUD barème', '/configuration/other/grade-scales')
		|| await openDialogButton(page, /add scale|ajouter un barème/i);
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
			coverCompletedModal(journey, '/configuration/other/grade-scales', 'create', {
				opened: true,
				submitted: true,
				closed,
				postcondition: listed && Boolean(scaleId),
			}, scaleName);
			coverActions(
				journey,
				'http://localhost:5173/configuration/other/grade-scales',
				['Liste barèmes', 'CRUD barème'],
				closed && listed && scaleId ? 'OK' : 'NOT OK',
				scaleName,
			);
			logStep(journey, { step: 'grade-scale', ok: Boolean(scaleId), detail: scaleName, entityId: scaleId ?? undefined });
		}
		catch (err) {
			const detail = err instanceof Error ? err.message : String(err);
			coverCompletedModal(journey, '/configuration/other/grade-scales', 'create', {
				opened: true,
				submitted: false,
				closed: false,
			}, detail);
			coverActions(journey, 'http://localhost:5173/configuration/other/grade-scales', ['CRUD barème'], 'NOT OK', detail);
			logStep(journey, { step: 'grade-scale', ok: false, detail });
			await page.keyboard.press('Escape').catch(() => {});
		}
	}
	else {
		coverCompletedModal(journey, '/configuration/other/grade-scales', 'create', {
			opened: false,
			submitted: false,
			closed: false,
		}, 'Scale modal not found');
		coverActions(journey, 'http://localhost:5173/configuration/other/grade-scales', ['CRUD barème'], 'NOT OK', 'Scale modal not found');
		logStep(journey, { step: 'grade-scale', ok: false, detail: 'Scale modal not found' });
	}

	await visitCovered(journey, '/configuration/report-cards', '/configuration/report-cards');
	await page.getByRole('button', { name: /add model|ajouter un modèle/i }).first()
		.waitFor({ state: 'visible', timeout: 20_000 })
		.catch(() => {});
	if (!entities.gradeScaleId) {
		logStep(journey, { step: 'report-card-def', ok: false, detail: 'No gradeScaleId to reference' });
		coverCompletedModal(journey, '/configuration/report-cards', 'create', {
			opened: false,
			submitted: false,
			closed: false,
		}, 'No gradeScaleId to reference');
		coverActions(journey, 'http://localhost:5173/configuration/report-cards', ['Créer / supprimer / publier'], 'NOT OK', 'No gradeScaleId to reference');
	}
	else {
		const rcOpened = await clickCreateButton(page, 'Créer / supprimer / publier', '/configuration/report-cards')
			|| await openDialogButton(page, /add model|ajouter un modèle|créer/i)
			|| await openUrlModal(page, '/configuration/report-cards', 'create', { base: ctx.base, timeout: 15_000 });
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
				const closed = await waitForDialogClosed(page);
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
				coverCompletedModal(journey, '/configuration/report-cards', 'create', {
					opened: true,
					submitted: true,
					closed,
					postcondition: Boolean(defId),
				}, rcName);
				coverActions(journey, 'http://localhost:5173/configuration/report-cards', ['Liste définitions bulletins', 'Créer / supprimer / publier'], defId ? 'OK' : 'NOT OK', rcName);
				if (defId) {
					await gotoApp(journey, `/configuration/report-cards/${defId}`);
					await visitCovered(journey, '/configuration/report-cards/[id]', `/configuration/report-cards/${defId}`);
					coverActions(journey, 'http://localhost:5173/configuration/report-cards/[id]', ['Drawer définition'], 'OK');
				}
				logStep(journey, { step: 'report-card-def', ok: Boolean(defId), detail: rcName, entityId: defId ?? undefined });
			}
			catch (err) {
				const detail = err instanceof Error ? err.message : String(err);
				coverCompletedModal(journey, '/configuration/report-cards', 'create', {
					opened: true,
					submitted: false,
					closed: false,
				}, detail);
				logStep(journey, { step: 'report-card-def', ok: false, detail });
				coverActions(journey, 'http://localhost:5173/configuration/report-cards', ['Créer / supprimer / publier'], 'NOT OK', detail);
				await page.keyboard.press('Escape').catch(() => {});
			}
		}
		else {
			coverCompletedModal(journey, '/configuration/report-cards', 'create', {
				opened: false,
				submitted: false,
				closed: false,
			}, 'Create definition modal not found');
			logStep(journey, { step: 'report-card-def', ok: false, detail: 'Create definition modal not found' });
		}
	}

	entities.notificationTemplateKey = 'report_card.published';
	await ensureNotificationTemplatesViaApi(page, ctx.base, { classGroupId: entities.classId });
	await visitCovered(journey, '/configuration/notifications', '/configuration/notifications');
	const detailPath = `/configuration/notifications/${entities.notificationTemplateKey}`;
	await visitCovered(journey, '/configuration/notifications/[id]', detailPath);
	const drawer = page.getByTestId('notification-template-drawer');
	const drawerVisible = await drawer.isVisible({ timeout: 12_000 }).catch(() => false);
	const preview = drawer.getByTestId('notification-email-preview');
	const previewHtml = drawerVisible ? await preview.innerHTML().catch(() => '') : '';
	const previewText = drawerVisible ? await preview.innerText().catch(() => '') : '';
	const renderedEmail = previewHtml.includes('<p>') && !previewText.includes('<p>');
	coverActions(
		journey,
		'http://localhost:5173/configuration/notifications/[id]',
		['Drawer template'],
		drawerVisible && renderedEmail ? 'OK' : 'NOT OK',
	);

	const notifDialog = await openDialogButton(page, /edit|modifier|éditer/i)
		|| await openUrlModal(page, detailPath, 'edit', { base: ctx.base, timeout: 12_000 });
	coverActions(journey, 'http://localhost:5173/configuration/notifications', ['Templates notifications école'], drawerVisible ? 'OK' : 'NOT OK');

	let saved = false;
	if (notifDialog) {
		try {
			const dialog = page.getByRole('dialog');
			const emailTab = dialog.getByRole('button', { name: /e-mail|email/i }).first();
			if (await emailTab.isVisible({ timeout: 4_000 }).catch(() => false)) {
				await emailTab.click();
			}
			const editor = dialog.getByTestId('notification-rich-text-editor').locator('[contenteditable="true"]');
			const editorVisible = await editor.isVisible({ timeout: 8_000 }).catch(() => false);
			const customSubject = `E2E-Notif-${Date.now()}`;
			await dialog.locator('input').first().fill(customSubject);
			if (editorVisible) {
				await editor.click();
				await page.keyboard.type(' E2E');
			}
			const payloadPromise = waitForCommandPayload(page, 'update-school-notification-templates');
			await submitDialog(page);
			const closed = await waitForDialogClosed(page);
			const payload = await payloadPromise;
			await waitForPageQuery(page);
			const drawerShowsSubject = await drawer.getByText(customSubject).isVisible({ timeout: 8_000 }).catch(() => false);
			saved = Boolean(closed && payload && drawerShowsSubject);
			coverCompletedModal(journey, '/configuration/notifications/[id]', 'edit', {
				opened: true,
				submitted: true,
				closed,
				postcondition: drawerShowsSubject,
			}, customSubject);
			coverActions(
				journey,
				'http://localhost:5173/configuration/notifications/[id]',
				['Éditer modèle rich text'],
				saved && editorVisible ? 'OK' : 'NOT OK',
				customSubject,
			);
		}
		catch (err) {
			const detail = err instanceof Error ? err.message : String(err);
			coverCompletedModal(journey, '/configuration/notifications/[id]', 'edit', {
				opened: true,
				submitted: false,
				closed: false,
			}, detail);
		}
	}
	else {
		coverCompletedModal(journey, '/configuration/notifications/[id]', 'edit', {
			opened: false,
			submitted: false,
			closed: false,
		});
	}
	logStep(journey, {
		step: 'notification-template',
		ok: drawerVisible && notifDialog && saved,
		detail: entities.notificationTemplateKey,
	});

	await visitCovered(journey, '/configuration/other/discipline', '/configuration/other/discipline');
	const discOpened = await clickCreateButton(page, 'CRUD entrée', '/configuration/other/discipline')
		|| await openDialogButton(page, /add|ajouter|créer|create/i);
	if (discOpened) {
		try {
			const discName = `E2E-Discipline-${Date.now()}`;
			await page.getByRole('dialog').locator('input').first().fill(discName);
			await submitDialog(page);
			const closed = await waitForDialogClosed(page);
			const listed = await assertListContains(page, discName, true, 20_000);
			if (listed) {
				entities.filterFixtures.disciplineByKind = { default: { id: discName, name: discName } };
			}
			coverCompletedModal(journey, '/configuration/other/discipline', 'create', {
				opened: true,
				submitted: true,
				closed,
				postcondition: listed,
			}, discName);
			coverActions(journey, 'http://localhost:5173/configuration/other/discipline', ['Catalogue disciplinaire', 'CRUD entrée'], listed ? 'OK' : 'NOT OK', discName);
			logStep(journey, { step: 'discipline', ok: listed, detail: discName });
		}
		catch (err) {
			const detail = err instanceof Error ? err.message : String(err);
			coverCompletedModal(journey, '/configuration/other/discipline', 'create', {
				opened: true,
				submitted: false,
				closed: false,
			}, detail);
			logStep(journey, { step: 'discipline', ok: false, detail });
			await page.keyboard.press('Escape').catch(() => {});
		}
	}
	else {
		coverCompletedModal(journey, '/configuration/other/discipline', 'create', {
			opened: false,
			submitted: false,
			closed: false,
		}, 'Discipline modal not found');
		logStep(journey, { step: 'discipline', ok: false, detail: 'Discipline modal not found' });
	}

	await visitCovered(journey, '/configuration/other/subject-categories', '/configuration/other/subject-categories');
	const categoryName = `E2E-Category-${Date.now()}`;
	const categoryOpened = await clickCreateButton(page, 'CRUD catégorie', '/configuration/other/subject-categories')
		|| await openDialogButton(page, /ajouter une catégorie|add category/i);
	if (categoryOpened) {
		try {
			await page.getByRole('dialog').locator('input').first().fill(categoryName);
			await submitDialog(page);
			const closed = await waitForDialogClosed(page);
			const listed = await assertListContains(page, categoryName, true, 20_000);
			coverCompletedModal(journey, '/configuration/other/subject-categories', 'create', {
				opened: true,
				submitted: true,
				closed,
				postcondition: listed,
			}, categoryName);
			coverActions(
				journey,
				'http://localhost:5173/configuration/other/subject-categories',
				['Liste catégories', 'CRUD catégorie'],
				listed ? 'OK' : 'NOT OK',
				categoryName,
			);
			logStep(journey, { step: 'subject-category', ok: listed, detail: categoryName });
		}
		catch (err) {
			const detail = err instanceof Error ? err.message : String(err);
			coverCompletedModal(journey, '/configuration/other/subject-categories', 'create', {
				opened: true,
				submitted: false,
				closed: false,
			}, detail);
			coverActions(journey, 'http://localhost:5173/configuration/other/subject-categories', ['CRUD catégorie'], 'NOT OK', detail);
			logStep(journey, { step: 'subject-category', ok: false, detail });
			await page.keyboard.press('Escape').catch(() => {});
		}
	}
	else {
		coverCompletedModal(journey, '/configuration/other/subject-categories', 'create', {
			opened: false,
			submitted: false,
			closed: false,
		}, 'Subject category modal not found');
		coverActions(journey, 'http://localhost:5173/configuration/other/subject-categories', ['CRUD catégorie'], 'NOT OK', 'Subject category modal not found');
		logStep(journey, { step: 'subject-category', ok: false, detail: 'Subject category modal not found' });
	}

	await visitCovered(journey, '/configuration/permission-profiles', '/configuration/permission-profiles');
	const profileOpened = await clickCreateButton(page, 'CRUD entrée', '/configuration/permission-profiles')
		|| await openDialogButton(page, /add profile|ajouter un profil|créer|create/i);
	if (profileOpened) {
		try {
			const profileName = `E2E-Profile-${Date.now()}`;
			await page.getByRole('dialog').locator('input').first().fill(profileName);
			await submitDialog(page);
			const closed = await waitForDialogClosed(page);
			const listed = await assertListContains(page, profileName, true, 20_000);
			coverCompletedModal(journey, '/configuration/permission-profiles', 'create', {
				opened: true,
				submitted: true,
				closed,
				postcondition: listed,
			}, profileName);
			coverActions(journey, 'http://localhost:5173/configuration/permission-profiles', ['Catalogue des profils', 'CRUD entrée'], listed ? 'OK' : 'NOT OK', profileName);
			logStep(journey, { step: 'permission-profiles', ok: listed, detail: profileName });
		}
		catch (err) {
			const detail = err instanceof Error ? err.message : String(err);
			coverCompletedModal(journey, '/configuration/permission-profiles', 'create', {
				opened: true,
				submitted: false,
				closed: false,
			}, detail);
			logStep(journey, { step: 'permission-profiles', ok: false, detail });
			await page.keyboard.press('Escape').catch(() => {});
		}
	}
	else {
		coverCompletedModal(journey, '/configuration/permission-profiles', 'create', {
			opened: false,
			submitted: false,
			closed: false,
		}, 'Permission profile modal not found');
		logStep(journey, { step: 'permission-profiles', ok: false, detail: 'Permission profile modal not found' });
	}
}
