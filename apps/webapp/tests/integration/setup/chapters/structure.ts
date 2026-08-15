import {
	dismissPageError,
	ensureAcademicYearReady,
	fillClassCreateDialog,
	fillGradeLevelCreateDialog,
	openDialogButton,
	refreshAppShell,
	submitDialog,
	waitForDialogClosed,
	waitForPageQuery,
	waitForResolvedAcademicYearId,
} from '../../../../scripts/qa-harness-ui';
import { configEntityIdByName } from '../../../../scripts/qa-matrix-support';
import { ensureDailyAttendanceMode } from '../../demo-dry-run/support/setup';
import {
	coverActions,
	coverModal,
	gotoApp,
	logStep,
	visitCovered,
	type UiJourney,
} from '../journey-context';

export async function runStructureChapter(journey: UiJourney): Promise<boolean> {
	const { ctx, entities } = journey;
	const { page } = ctx;
	console.log('\n--- Journey: structure ---');

	const fatalDash = await visitCovered(journey, '/dashboard', '/dashboard');
	coverActions(journey, '(app)', ['Sidebar — modules visibles selon permissions', 'Sélecteur école', 'Sélecteur année scolaire'], fatalDash ? 'NOT OK' : 'OK');
	coverActions(journey, 'http://localhost:5173/dashboard', ['Chargement KPIs', 'Cartes actions cliquables', 'États empty / erreur'], fatalDash ? 'NOT OK' : 'OK');

	const langBtn = page.getByRole('button', { name: /fr|en|langue|language/i }).first();
	if (await langBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
		await langBtn.click();
		coverActions(journey, '(app)', ['Changement langue FR/EN'], 'OK');
	}

	await gotoApp(journey, '/dashboard?modal=account-profile');
	const profileDialog = page.getByRole('dialog');
	const profileOpen = await profileDialog.isVisible({ timeout: 8_000 }).catch(() => false);
	coverActions(journey, '(app)', ['Avatar — modal profil', '?modal=account-profile ouvre profil'], profileOpen ? 'OK' : 'NOT OK');
	coverModal(journey, '/dashboard', 'account-profile', profileOpen ? 'OK' : 'NOT OK');
	if (profileOpen) {
		await page.keyboard.press('Escape');
	}

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
			coverActions(journey, 'http://localhost:5173/configuration/academic', ['CRUD années scolaires'], 'NOT OK', 'Create year modal not found');
			return false;
		}
		coverModal(journey, '/configuration/academic', 'create', 'OK');

		const label = `E2E ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
		await page.getByRole('dialog').locator('input').first().fill(label);
		await submitDialog(page);
		if (!(await waitForDialogClosed(page))) {
			logStep(journey, { step: 'academic-year', ok: false, detail: 'Create year modal still open after submit' });
			return false;
		}
		await waitForPageQuery(page);
		await page.getByRole('heading', { name: label, exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
		const ready = await ensureAcademicYearReady(page, label);
		if (!ready) {
			logStep(journey, { step: 'academic-year', ok: false, detail: `Year created but not visible as published (${label})` });
			coverActions(journey, 'http://localhost:5173/configuration/academic', ['Publier année'], 'NOT OK');
			return false;
		}
		entities.filterFixtures.academicYearsByStatus = { published: { id: label, label } };
		await refreshAppShell(page, ctx.base);
		coverActions(journey, 'http://localhost:5173/configuration/academic', ['CRUD années scolaires', 'Publier année', 'Définitions périodes (wizard)'], 'OK', label);
		logStep(journey, { step: 'academic-year', ok: true, detail: `${label} (published)` });
	}
	catch (err) {
		logStep(journey, { step: 'academic-year', ok: false, detail: err instanceof Error ? err.message : String(err) });
		return false;
	}

	try {
		await gotoApp(journey, '/configuration/grade-levels');
		await visitCovered(journey, '/configuration/grade-levels', '/configuration/grade-levels');
		const opened = await openDialogButton(page, /ajouter un niveau|add grade level/i);
		if (!opened) {
			logStep(journey, { step: 'grade-level', ok: false, detail: 'Create grade level modal not found' });
			return false;
		}
		coverModal(journey, '/configuration/grade-levels', 'create', 'OK');
		const name = `E2E-6eme-${Date.now()}`;
		await fillGradeLevelCreateDialog(page, name);
		if (!(await waitForDialogClosed(page))) {
			logStep(journey, { step: 'grade-level', ok: false, detail: 'Grade level modal still open after submit' });
			return false;
		}
		await page.waitForTimeout(1_000);
		await refreshAppShell(page, ctx.base);
		await gotoApp(journey, '/configuration/grade-levels');
		const entityId = await configEntityIdByName(page, name);
		entities.gradeLevelId = entityId;
		entities.level = entityId;
		coverActions(journey, 'http://localhost:5173/configuration/grade-levels', ['Liste niveaux', 'Créer niveau'], entityId ? 'OK' : 'NOT OK', name);
		if (entityId) {
			await gotoApp(journey, `/configuration/grade-levels/${entityId}`);
			await visitCovered(journey, '/configuration/grade-levels/[id]', `/configuration/grade-levels/${entityId}`);
			coverActions(journey, 'http://localhost:5173/configuration/grade-levels/[id]', ['Drawer — éditer / supprimer'], 'OK');
			coverModal(journey, '/configuration/grade-levels/[id]', 'edit', 'OK');
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
		await gotoApp(journey, '/configuration/classes');
		await visitCovered(journey, '/configuration/classes', '/configuration/classes');
		await dismissPageError(page);
		const opened = await openDialogButton(page, /ajouter une classe|add class/i);
		if (!opened) {
			logStep(journey, { step: 'class', ok: false, detail: 'Create class modal not found' });
			return false;
		}
		coverModal(journey, '/configuration/classes', 'create', 'OK');
		const className = `E2E-6A-${Date.now()}`;
		await fillClassCreateDialog(page, className);
		if (!(await waitForDialogClosed(page))) {
			logStep(journey, { step: 'class', ok: false, detail: 'Class modal still open after submit' });
			return false;
		}
		await page.waitForTimeout(1_000);
		await refreshAppShell(page, ctx.base);
		await gotoApp(journey, '/configuration/classes');
		const entityId = await configEntityIdByName(page, className);
		entities.configClassId = entityId;
		entities.classId = entityId;
		coverActions(journey, 'http://localhost:5173/configuration/classes', ['Liste classes', 'Créer classe'], entityId ? 'OK' : 'NOT OK', className);
		if (!entityId) {
			logStep(journey, { step: 'class', ok: false, detail: `Class "${className}" not found after create` });
			return false;
		}
		await gotoApp(journey, `/configuration/classes/${entityId}/profile`);
		await visitCovered(journey, '/configuration/classes/[id]/profile', `/configuration/classes/${entityId}/profile`);
		coverActions(journey, 'http://localhost:5173/configuration/classes/[id]/profile', ['Profil classe — éditer'], 'OK');
		const daily = await ensureDailyAttendanceMode(ctx, entityId, { force: true });
		coverModal(journey, '/configuration/classes/[id]/profile', 'edit', daily ? 'OK' : 'NOT OK');
		logStep(journey, { step: 'class', ok: true, detail: `${className} daily=${daily}`, entityId });
	}
	catch (err) {
		logStep(journey, { step: 'class', ok: false, detail: err instanceof Error ? err.message : String(err) });
		return false;
	}

	return true;
}
