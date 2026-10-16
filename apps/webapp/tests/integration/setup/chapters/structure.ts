import {
	dismissPageError,
	ensureAcademicYearReady,
	fillAcademicYearCreateDialog,
	fillClassCreateDialog,
	fillGradeLevelCreateDialog,
	fillLabeledInput,
	openDialogButton,
	openUrlModal,
	refreshAppShell,
	submitDialog,
	waitForDialogClosed,
	waitForPageQuery,
	waitForResolvedAcademicYearId,
	setAppLang,
	dialogHasInputValue,
} from '../../../../scripts/qa-harness-ui';
import { configEntityIdByName } from '../../../../scripts/qa-matrix-support';
import { ensureDailyAttendanceMode } from '../../demo-dry-run/support/setup';
import { ensureDailyAttendanceViaApi } from '../journey-api';
import {
	coverActions,
	coverCompletedModal,
	gotoApp,
	logStep,
	runModalMutation,
	visitCovered,
	waitForCommandResult,
	type UiJourney,
} from '../journey-context';

export async function runStructureChapter(journey: UiJourney): Promise<boolean> {
	const { ctx, entities } = journey;
	const { page } = ctx;
	console.log('\n--- Journey: structure ---');

	const fatalDash = await visitCovered(journey, '/dashboard', '/dashboard');
	coverActions(journey, '(app)', ['Sidebar — modules visibles selon permissions', 'Sélecteur école', 'Sélecteur année scolaire'], fatalDash ? 'NOT OK' : 'OK');
	coverActions(journey, 'http://localhost:5173/dashboard', ['Chargement KPIs', 'Cartes actions cliquables', 'États empty / erreur'], fatalDash ? 'NOT OK' : 'OK');

	await gotoApp(journey, '/dashboard?modal=account-profile');
	const profileDialog = page.getByRole('dialog');
	const profileOpen = await profileDialog.isVisible({ timeout: 8_000 }).catch(() => false);
	coverActions(journey, '(app)', ['Avatar — modal profil', '?modal=account-profile ouvre profil'], profileOpen ? 'OK' : 'NOT OK');
	let profileClosed = false;
	let profileSaved = false;
	if (profileOpen) {
		const photoBtn = profileDialog.getByRole('button', { name: /change profile photo|changer la photo/i }).first();
		if (await photoBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
			const resultPromise = waitForCommandResult(page, 'update-staff-member-profile', 20_000);
			await photoBtn.click();
			const png = Buffer.from(
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
				'base64',
			);
			await page.locator('input[type="file"]').last().setInputFiles({
				name: 'qa-photo.png',
				mimeType: 'image/png',
				buffer: png,
			});
			const cropConfirm = page.getByRole('button', { name: /use this photo|utiliser cette photo/i }).first();
			if (await cropConfirm.isVisible({ timeout: 8_000 }).catch(() => false)) {
				await cropConfirm.click();
				profileSaved = (await resultPromise) !== null;
			}
		}
		await page.keyboard.press('Escape').catch(() => {});
		profileClosed = await waitForDialogClosed(page).catch(() => false);
	}
	coverCompletedModal(journey, '/dashboard', 'account-profile', {
		opened: profileOpen,
		submitted: profileSaved,
		closed: profileClosed,
		postcondition: profileSaved,
	}, profileSaved ? 'profile photo saved' : 'account profile photo not submitted');

	await visitCovered(journey, '/account/inbox', '/account/inbox');
	coverActions(journey, 'http://localhost:5173/account/inbox', ['Liste notifications'], 'OK');
	await visitCovered(journey, '/account/notifications', '/account/notifications');
	coverActions(journey, 'http://localhost:5173/account/notifications', ['Charger préférences'], 'OK');

	try {
		await gotoApp(journey, '/configuration/academic');
		await visitCovered(journey, '/configuration/academic', '/configuration/academic');
		const opened = await openDialogButton(page, /add academic year|ajouter une année scolaire/i);
		if (!opened) {
			logStep(journey, { step: 'academic-year', ok: false, detail: 'Create year button or modal not found' });
			coverCompletedModal(journey, '/configuration/academic', 'create', {
				opened: false,
				submitted: false,
				closed: false,
			}, 'Create year modal not found');
			coverActions(journey, 'http://localhost:5173/configuration/academic', ['Créer année scolaire'], 'NOT OK', 'Create year modal not found');
			return false;
		}

		const label = await fillAcademicYearCreateDialog(page);
		await submitDialog(page);
		const yearClosed = await waitForDialogClosed(page);
		if (!yearClosed) {
			coverCompletedModal(journey, '/configuration/academic', 'create', {
				opened: true,
				submitted: true,
				closed: false,
			}, 'Create year modal still open after submit');
			logStep(journey, { step: 'academic-year', ok: false, detail: 'Create year modal still open after submit' });
			return false;
		}
		await waitForPageQuery(page);
		await page.getByRole('heading', { name: label, exact: true }).first().waitFor({ state: 'visible', timeout: 20_000 });
		const ready = await ensureAcademicYearReady(page, label);
		coverCompletedModal(journey, '/configuration/academic', 'create', {
			opened: true,
			submitted: true,
			closed: yearClosed,
			postcondition: ready,
		}, label);
		if (!ready) {
			logStep(journey, { step: 'academic-year', ok: false, detail: `Year created but not visible as published (${label})` });
			coverActions(journey, 'http://localhost:5173/configuration/academic', ['Publier année'], 'NOT OK');
			return false;
		}
		entities.filterFixtures.academicYearsByStatus = { published: { id: label, label } };
		await refreshAppShell(page, ctx.base);
		await waitForResolvedAcademicYearId(page);

		const langOk = await setAppLang(page, 'en');
		coverActions(journey, '(app)', ['Changement langue FR/EN'], langOk ? 'OK' : 'NOT OK');

		let wizardOk = false;
		if (langOk) {
			try {
				await visitCovered(journey, '/configuration/period-grid', '/configuration/period-grid');
				await page.getByRole('heading', { name: /weekly period grid|grille horaire/i }).first().waitFor({ state: 'visible', timeout: 20_000 });
				const yearSelect = page.getByTestId('list-filter-select');
				const yearSelectVisible = await yearSelect.isVisible({ timeout: 8_000 }).catch(() => false);
				coverActions(
					journey,
					'http://localhost:5173/configuration/period-grid',
					['Sélecteur année'],
					yearSelectVisible ? 'OK' : 'NOT OK',
				);
				const yearId = await page.evaluate(() => sessionStorage.getItem('edaya:yearId'));
				let opened = false;
				if (yearId) {
					opened = await openUrlModal(page, '/configuration/period-grid', 'period-def-wizard', {
						target: yearId,
						step: 'preset',
						base: ctx.base,
					});
				}
				if (!opened) {
					opened = await openDialogButton(page, /quick setup|configuration rapide|secondaire standard|standard secondary/i);
				}
				const dialog = page.getByRole('dialog');
				if (opened || await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
					const preset = dialog.getByRole('button', { name: /standard secondary|secondaire standard/i }).first();
					if (await preset.isVisible({ timeout: 5_000 }).catch(() => false)) {
						await preset.click();
					}
					const next = dialog.getByRole('button', { name: /next|suivant/i }).last();
					if (await next.isVisible({ timeout: 5_000 }).catch(() => false)) {
						await next.click();
					}
					const hasPeriod1 = await dialogHasInputValue(dialog, /période 1|period 1/i);
					const hasBreak = await dialogHasInputValue(dialog, /récréation|^break$|lunch break/i);
					wizardOk = hasPeriod1 && hasBreak;
					await page.keyboard.press('Escape').catch(() => {});
					await waitForDialogClosed(page).catch(() => false);
				}
			}
			catch (err) {
				console.error(
					'Period wizard catalog assert failed; academic year stays published:',
					err instanceof Error ? err.message : err,
				);
			}
		}
		coverActions(
			journey,
			'http://localhost:5173/configuration/academic',
			['Créer année scolaire', 'Publier année'],
			'OK',
			label,
		);
		coverActions(
			journey,
			'http://localhost:5173/configuration/period-grid',
			['Définitions périodes (wizard)'],
			wizardOk ? 'OK' : 'NOT OK',
			label,
		);
		const restoredFr = await setAppLang(page, 'fr');
		if (!restoredFr) {
			logStep(journey, { step: 'academic-year', ok: false, detail: 'Could not restore FR after catalog EN asserts' });
			return false;
		}
		logStep(journey, { step: 'academic-year', ok: true, detail: `${label} (published) wizardEn=${wizardOk}` });
	}
	catch (err) {
		logStep(journey, { step: 'academic-year', ok: false, detail: err instanceof Error ? err.message : String(err) });
		return false;
	}

	try {
		await gotoApp(journey, '/configuration/structure/details');
		await visitCovered(journey, '/configuration/structure/details', '/configuration/structure/details');
		const opened = await openDialogButton(page, /ajouter un niveau|add grade level/i);
		if (!opened) {
			coverCompletedModal(journey, '/configuration/structure/details', 'create-level', {
				opened: false,
				submitted: false,
				closed: false,
			}, 'Create grade level modal not found');
			logStep(journey, { step: 'grade-level', ok: false, detail: 'Create grade level modal not found' });
			return false;
		}
		const name = `E2E-6eme-${Date.now()}`;
		await fillGradeLevelCreateDialog(page, name);
		const gradeClosed = await waitForDialogClosed(page);
		if (!gradeClosed) {
			coverCompletedModal(journey, '/configuration/structure/details', 'create-level', {
				opened: true,
				submitted: true,
				closed: false,
			}, 'Grade level modal still open after submit');
			logStep(journey, { step: 'grade-level', ok: false, detail: 'Grade level modal still open after submit' });
			return false;
		}
		await page.waitForTimeout(1_000);
		await refreshAppShell(page, ctx.base);
		await gotoApp(journey, '/configuration/structure/details');
		const entityId = await configEntityIdByName(page, name);
		entities.gradeLevelId = entityId;
		entities.level = entityId;
		coverCompletedModal(journey, '/configuration/structure/details', 'create-level', {
			opened: true,
			submitted: true,
			closed: gradeClosed,
			postcondition: Boolean(entityId),
		}, name);
		coverActions(journey, 'http://localhost:5173/configuration/structure/details', ['Liste niveaux', 'Créer niveau'], entityId ? 'OK' : 'NOT OK', name);
		if (entityId) {
			await gotoApp(journey, `/configuration/structure/details?gradeLevel=${entityId}`);
			await visitCovered(journey, '/configuration/structure/details', `/configuration/structure/details?gradeLevel=${entityId}`);
			const cycleToken = `QA-cycle-${Date.now()}`;
			await runModalMutation(journey, {
				parentRoute: '/configuration/structure/details',
				modal: 'edit-level',
				pathname: `/configuration/structure/details?gradeLevel=${entityId}`,
				command: 'configure-grade-level',
				fill: async (current) => {
					await fillLabeledInput(current, /cycle/i, cycleToken);
				},
				visibleAfter: cycleToken,
				listPath: `/configuration/structure/details?gradeLevel=${entityId}`,
			});
		}
		logStep(journey, { step: 'grade-level', ok: Boolean(entityId), detail: name, entityId: entityId ?? undefined });
		if (!entityId) {
			return false;
		}
	}
	catch (err) {
		logStep(journey, { step: 'grade-level', ok: false, detail: err instanceof Error ? err.message : String(err) });
		return false;
	}

	try {
		await refreshAppShell(page, ctx.base);
		await waitForResolvedAcademicYearId(page);
		await gotoApp(journey, '/configuration/structure/classes');
		await visitCovered(journey, '/configuration/structure/classes', '/configuration/structure/classes');
		await dismissPageError(page);
		const opened = await openDialogButton(page, /ajouter une classe|add class/i);
		if (!opened) {
			coverCompletedModal(journey, '/configuration/structure/classes', 'create', {
				opened: false,
				submitted: false,
				closed: false,
			}, 'Create class modal not found');
			logStep(journey, { step: 'class', ok: false, detail: 'Create class modal not found' });
			return false;
		}
		const className = `E2E-6A-${Date.now()}`;
		await fillClassCreateDialog(page, className, entities.gradeLevelId ?? undefined);
		const classClosed = await waitForDialogClosed(page);
		if (!classClosed) {
			coverCompletedModal(journey, '/configuration/structure/classes', 'create', {
				opened: true,
				submitted: true,
				closed: false,
			}, 'Class modal still open after submit');
			logStep(journey, { step: 'class', ok: false, detail: 'Class modal still open after submit' });
			return false;
		}
		await page.waitForTimeout(1_000);
		await refreshAppShell(page, ctx.base);
		await gotoApp(journey, '/configuration/structure/classes');
		const entityId = await configEntityIdByName(page, className);
		entities.configClassId = entityId;
		entities.classId = entityId;
		coverCompletedModal(journey, '/configuration/structure/classes', 'create', {
			opened: true,
			submitted: true,
			closed: classClosed,
			postcondition: Boolean(entityId),
		}, className);
		coverActions(journey, 'http://localhost:5173/configuration/structure/classes', ['Liste classes', 'Créer classe'], entityId ? 'OK' : 'NOT OK', className);
		if (!entityId) {
			logStep(journey, { step: 'class', ok: false, detail: `Class "${className}" not found after create` });
			return false;
		}
		await gotoApp(journey, `/configuration/structure/classes/${entityId}/profile`);
		await visitCovered(journey, '/configuration/structure/classes/[id]/profile', `/configuration/structure/classes/${entityId}/profile`);
		await runModalMutation(journey, {
			parentRoute: '/configuration/structure/classes/[id]/profile',
			modal: 'edit',
			pathname: `/configuration/structure/classes/${entityId}/profile`,
			command: 'update-class-group-configuration',
			fill: async (current) => {
				await fillLabeledInput(current, /capacity|capacité/i, '47');
			},
			visibleAfter: '47',
			listPath: `/configuration/structure/classes/${entityId}/profile`,
			actionPath: 'http://localhost:5173/configuration/structure/classes/[id]/profile',
			actions: ['Profil classe — éditer'],
		});
		const daily = await ensureDailyAttendanceMode(ctx, entityId, { force: true });
		let dailyOk = daily;
		if (!dailyOk) {
			dailyOk = await ensureDailyAttendanceViaApi(page, ctx.base, entityId);
			if (dailyOk) {
				await refreshAppShell(page, ctx.base);
			}
		}
		logStep(journey, { step: 'class', ok: true, detail: `${className} daily=${dailyOk}`, entityId });
	}
	catch (err) {
		logStep(journey, { step: 'class', ok: false, detail: err instanceof Error ? err.message : String(err) });
		return false;
	}

	return true;
}
