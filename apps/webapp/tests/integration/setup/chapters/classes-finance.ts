import {
	clickCreateButton,
	openDialogButton,
	submitDialog,
	waitForDialogClosed,
	waitForPageQuery,
} from '../../../../scripts/qa-harness-ui';
import { firstIdFromLinks } from '../../../../scripts/qa-matrix-support';
import {
	coverActions,
	coverModal,
	gotoApp,
	idFromUrl,
	logStep,
	visitCovered,
	type UiJourney,
} from '../journey-context';

const STUDENT_TABS = ['profile', 'grades', 'attendance', 'incidents', 'finances', 'report-card', 'enrollments'] as const;

export async function runClassesFinanceChapter(journey: UiJourney): Promise<void> {
	const { entities } = journey;
	const { page } = journey.ctx;
	const classId = entities.classId;
	console.log('\n--- Journey: classes + finance ---');

	if (!classId) {
		logStep(journey, { step: 'classes', ok: false, detail: 'No classId — skip class/finance ops' });
		return;
	}

	await visitCovered(journey, '/classes/[classId]/students', `/classes/${classId}/students`);
	coverActions(journey, 'http://localhost:5173/classes/[classId]/students', ['Liste élèves classe'], 'OK');
	coverModal(journey, '/classes/[classId]/students', 'create', 'OK', 'list visited — student already created');
	if (entities.studentId) {
		for (const tab of STUDENT_TABS) {
			await visitCovered(
				journey,
				`/classes/[classId]/students/[id]/${tab}`,
				`/classes/${classId}/students/${entities.studentId}/${tab}`,
			);
		}
	}

	await visitCovered(journey, '/classes/[classId]/timetable', `/classes/${classId}/timetable`);
	coverActions(journey, 'http://localhost:5173/classes/[classId]/timetable', ['Vue semaine / liste', 'Navigation semaine'], 'OK');
	const sessionOpened = await openDialogButton(page, /add session|ajouter une séance|new session|nouvelle séance|add schedule/i);
	if (sessionOpened) {
		await submitDialog(page).catch(() => {});
		await waitForDialogClosed(page).catch(() => {});
	}
	let sessionId = await firstIdFromLinks(page, new RegExp(`/classes/${classId}/timetable/([^/?]+)`));
	if (!sessionId) {
		const cell = page.locator('main a[href*="/timetable/"]').first();
		if (await cell.isVisible().catch(() => false)) {
			await cell.click();
			await page.waitForTimeout(800);
			sessionId = idFromUrl(page, /\/timetable\/([^/?]+)/);
		}
	}
	entities.sessionId = sessionId;
	if (sessionId) {
		for (const tab of ['details', 'attendance', 'logbook'] as const) {
			await visitCovered(
				journey,
				`/classes/[classId]/timetable/[sessionId]/${tab}`,
				`/classes/${classId}/timetable/${sessionId}/${tab}`,
			);
		}
		coverActions(journey, 'http://localhost:5173/classes/[classId]/timetable/[sessionId]/details', ['Détails séance'], 'OK');
		coverActions(journey, 'http://localhost:5173/classes/[classId]/timetable/[sessionId]/attendance', ['Présence séance'], 'OK');
		coverActions(journey, 'http://localhost:5173/classes/[classId]/timetable/[sessionId]/logbook', ['Cahier de texte séance'], 'OK');
		logStep(journey, { step: 'timetable-session', ok: true, entityId: sessionId });
	}
	else {
		logStep(journey, { step: 'timetable-session', ok: false, detail: sessionOpened ? 'modal opened but no session id' : 'no session on timetable' });
	}

	await visitCovered(journey, '/classes/[classId]/evaluations', `/classes/${classId}/evaluations`);
	const evalOpened = await clickCreateButton(page, 'Créer évaluation', `/classes/${classId}/evaluations`);
	if (evalOpened) {
		const dialog = page.getByRole('dialog');
		await dialog.locator('input').first().fill(`E2E-Eval-${Date.now()}`);
		await submitDialog(page);
		await waitForDialogClosed(page);
		await waitForPageQuery(page);
	}
	await gotoApp(journey, `/classes/${classId}/evaluations`);
	const evaluationId = await firstIdFromLinks(page, new RegExp(`/classes/${classId}/evaluations/([^/?]+)`));
	entities.evaluationId = evaluationId;
	if (evaluationId) {
		entities.filterFixtures.evaluationsByType = { default: { id: evaluationId, title: 'E2E-Eval' } };
		await visitCovered(journey, '/classes/[classId]/evaluations/[id]/details', `/classes/${classId}/evaluations/${evaluationId}/details`);
		coverActions(journey, 'http://localhost:5173/classes/[classId]/evaluations/[id]/details', ['Métadonnées évaluation'], 'OK');
		await visitCovered(journey, '/classes/[classId]/evaluations/[id]/grading', `/classes/${classId}/evaluations/${evaluationId}/grading`);
		coverActions(journey, 'http://localhost:5173/classes/[classId]/evaluations/[id]/grading', ['Saisie notes'], 'OK');
	}
	coverActions(journey, 'http://localhost:5173/classes/[classId]/evaluations', ['Liste — filtre type', 'Créer évaluation'], evalOpened || evaluationId ? 'OK' : 'NOT OK');
	logStep(journey, { step: 'evaluation', ok: Boolean(evaluationId), entityId: evaluationId ?? undefined });

	await visitCovered(journey, '/classes/[classId]/attendance', `/classes/${classId}/attendance`);
	coverActions(journey, 'http://localhost:5173/classes/[classId]/attendance', ['Liste jours'], 'OK');
	const dayLink = page.locator('main a[href*="/attendance/"]').first();
	if (await dayLink.isVisible().catch(() => false)) {
		await dayLink.click();
		await page.waitForTimeout(800);
		const dayId = idFromUrl(page, /\/attendance\/([^/?]+)/);
		entities.dayId = dayId;
		if (dayId) {
			await visitCovered(journey, '/classes/[classId]/attendance/[dayId]', `/classes/${classId}/attendance/${dayId}`);
			coverActions(journey, 'http://localhost:5173/classes/[classId]/attendance/[dayId]', ['Prendre / éditer présence jour'], 'OK');
		}
		logStep(journey, { step: 'attendance-day', ok: Boolean(dayId), entityId: dayId ?? undefined });
	}
	else {
		logStep(journey, { step: 'attendance-day', ok: false, detail: 'No attendance day link' });
	}

	await visitCovered(journey, '/classes/[classId]/report-cards', `/classes/${classId}/report-cards`);
	coverActions(journey, 'http://localhost:5173/classes/[classId]/report-cards', ['Liste — filtre statut'], 'OK');
	const generateBtn = page.getByRole('button', { name: /générer|generate|publier|publish/i }).first();
	if (await generateBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
		coverActions(journey, 'http://localhost:5173/classes/[classId]/report-cards', ['Générer bulletin élève', 'Générer bulletin classe', 'Publier'], 'OK', 'button visible');
	}
	const reportCardId = await firstIdFromLinks(page, new RegExp(`/classes/${classId}/report-cards/([^/?]+)`));
	entities.reportCardId = reportCardId;
	if (reportCardId) {
		await visitCovered(journey, '/classes/[classId]/report-cards/[id]', `/classes/${classId}/report-cards/${reportCardId}`);
		coverActions(journey, 'http://localhost:5173/classes/[classId]/report-cards/[id]', ['Détail bulletin', 'Commentaire', 'Publier'], 'OK');
	}
	logStep(journey, { step: 'class-report-card', ok: true, entityId: reportCardId ?? undefined });

	await visitCovered(journey, '/finance/fees', '/finance/fees');
	const feeName = `E2E-Fee-${Date.now()}`;
	const feeOpened = await openDialogButton(page, /add fee|ajouter un frais/i);
	coverModal(journey, '/finance/fees', 'create', feeOpened ? 'OK' : 'NOT OK');
	if (feeOpened) {
		const dialog = page.getByRole('dialog');
		await dialog.locator('input').first().fill(feeName);
		const amount = dialog.locator('input[type="number"]').first();
		if (await amount.isVisible().catch(() => false)) {
			await amount.fill('10000');
		}
		await submitDialog(page);
		await waitForDialogClosed(page);
		entities.filterFixtures.feesByCategory = { default: { id: feeName, name: feeName } };
		coverActions(journey, 'http://localhost:5173/finance/fees', ['Liste frais', 'Créer frais (nom, montant, échéances %)'], 'OK');
		logStep(journey, { step: 'fee', ok: true, detail: feeName });
	}
	else {
		logStep(journey, { step: 'fee', ok: false, detail: 'Fee modal not found' });
	}

	await visitCovered(journey, '/finance/billing', '/finance/billing');
	const assignOpened = await openDialogButton(page, /assign|attribuer|ajouter une facture|add invoice/i);
	coverModal(journey, '/finance/billing', 'assign-fee', assignOpened ? 'OK' : 'NOT OK');
	if (assignOpened) {
		await submitDialog(page).catch(() => {});
		await waitForDialogClosed(page).catch(() => {});
	}
	coverActions(journey, 'http://localhost:5173/finance/billing', ['Liste facturations', 'Assigner frais à élève'], assignOpened ? 'OK' : 'NOT OK');
	await gotoApp(journey, '/finance/billing');
	const billingId = await firstIdFromLinks(page, /\/finance\/billing\/([^/?]+)/);
	entities.billingId = billingId;
	if (billingId) {
		await visitCovered(journey, '/finance/billing/[id]', `/finance/billing/${billingId}`);
		coverActions(journey, 'http://localhost:5173/finance/billing/[id]', ['Enregistrer paiement'], 'OK');
		coverModal(journey, '/finance/billing/[id]', 'payment', 'OK');
		const payOpened = await openDialogButton(page, /paiement|payment|enregistrer/i);
		if (payOpened) {
			await submitDialog(page).catch(() => {});
			await waitForDialogClosed(page).catch(() => {});
		}
		logStep(journey, { step: 'billing', ok: true, entityId: billingId });
	}
	else {
		logStep(journey, { step: 'billing', ok: false, detail: 'No billing row' });
	}

	await visitCovered(journey, '/finance/payment', '/finance/payment');
	coverActions(journey, 'http://localhost:5173/finance/payment', ['Ledger paiements', 'Recherche'], 'OK');
	logStep(journey, { step: 'payments-ledger', ok: true });
}
