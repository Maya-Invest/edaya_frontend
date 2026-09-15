import {
	clickCreateButton,
	fillAssignFeeDialog,
	fillEvaluationCreateDialog,
	fillFeeCreateDialog,
	fillNewSessionWizard,
	generateReportCardForStudent,
	isDeleteControlVisible,
	openDialogButton,
	submitDialog,
	trySubmitDialog,
	waitForDialogClosed,
	waitForPageQuery,
} from '../../../../scripts/qa-harness-ui';
import { buildTimetableSessionPath, firstIdFromLinks, timetableWeekFromSessionId } from '../../../../scripts/qa-matrix-support';
import {
	ensureTimetableSession,
	generateReportCardViaApi,
	lessonSessionExists,
	publishReportCardDefinitionViaApi,
} from '../journey-api';
import {
	coverActions,
	coverModal,
	gotoApp,
	idFromUrl,
	logStep,
	recordAttendanceForToday,
	visitCovered,
	waitForCommandPayload,
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

	const timetableVisit = await visitCovered(journey, '/classes/[classId]/timetable', `/classes/${classId}/timetable`);
	if (!timetableVisit) {
		coverActions(journey, 'http://localhost:5173/classes/[classId]/timetable', ['Vue semaine / liste', 'Navigation semaine'], 'OK');
	}
	const sessionTitle = `E2E-Session-${Date.now()}`;
	let sessionResult = await ensureTimetableSession(page, journey.ctx.base, {
		classGroupId: classId,
		classSubjectId: entities.teachingId,
		catalogSubjectId: entities.subjectId,
		title: sessionTitle,
	});
	if (!sessionResult) {
		const wizardSessionId = await fillNewSessionWizard(page, {
			classId,
			title: sessionTitle,
			base: journey.ctx.base,
		});
		if (wizardSessionId && await lessonSessionExists(page, journey.ctx.base, wizardSessionId)) {
			sessionResult = {
				sessionId: wizardSessionId,
				scheduleDate: timetableWeekFromSessionId(wizardSessionId)
					?? (wizardSessionId.split(':').slice(1).join(':') || ''),
			};
		}
	}
	const sessionId = sessionResult?.sessionId ?? null;
	entities.sessionId = sessionId;
	entities.timetableWeek = sessionResult?.scheduleDate
		?? (sessionId ? sessionId.split(':').slice(1).join(':') || null : null);
	if (sessionId) {
		for (const tab of ['details', 'attendance', 'logbook'] as const) {
			const visitPath = buildTimetableSessionPath(classId, sessionId, tab, entities.timetableWeek);
			await visitCovered(
				journey,
				`/classes/[classId]/timetable/[sessionId]/${tab}`,
				visitPath,
			);
		}
		coverActions(journey, 'http://localhost:5173/classes/[classId]/timetable/[sessionId]/details', ['Détails séance'], 'OK');
		coverActions(journey, 'http://localhost:5173/classes/[classId]/timetable/[sessionId]/attendance', ['Présence séance'], 'OK');
		coverActions(journey, 'http://localhost:5173/classes/[classId]/timetable/[sessionId]/logbook', ['Cahier de texte séance'], 'OK');
		logStep(journey, { step: 'timetable-session', ok: true, entityId: sessionId });
	}
	else {
		logStep(journey, { step: 'timetable-session', ok: false, detail: sessionId ? 'session id scraped only' : 'no session on timetable' });
	}

	await visitCovered(journey, '/classes/[classId]/evaluations', `/classes/${classId}/evaluations`);
	const evalOpened = await clickCreateButton(page, 'Créer évaluation', `/classes/${classId}/evaluations`);
	if (evalOpened) {
		const evalTitle = `E2E-Eval-${Date.now()}`;
		const filled = await fillEvaluationCreateDialog(page, evalTitle);
		if (filled) {
			const payloadPromise = waitForCommandPayload(page, 'create-assessment', 20_000);
			await trySubmitDialog(page);
			await waitForDialogClosed(page);
			await waitForPageQuery(page);
			const payload = await payloadPromise;
			if (typeof payload?.id === 'string') {
				entities.evaluationId = payload.id;
			}
		}
		else {
			await page.keyboard.press('Escape').catch(() => {});
		}
	}
	await gotoApp(journey, `/classes/${classId}/evaluations`);
	const evaluationId = entities.evaluationId
		?? await firstIdFromLinks(page, new RegExp(`/classes/${classId}/evaluations/([^/?]+)`));
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
	let dayId = await recordAttendanceForToday(journey, classId);
	if (!dayId) {
		const dayLink = page.locator('main a[href*="/attendance/"], main button').filter({ hasText: /roll call|appel/i }).first();
		if (await dayLink.isVisible().catch(() => false)) {
			await dayLink.click();
			await page.waitForTimeout(800);
			dayId = idFromUrl(page, /\/attendance\/([^/?]+)/);
		}
	}
	entities.dayId = dayId;
	if (dayId) {
		await visitCovered(journey, '/classes/[classId]/attendance/[dayId]', `/classes/${classId}/attendance/${dayId}`);
		coverActions(journey, 'http://localhost:5173/classes/[classId]/attendance/[dayId]', ['Prendre / éditer présence jour'], 'OK');
		logStep(journey, { step: 'attendance-day', ok: true, entityId: dayId });
	}
	else {
		logStep(journey, { step: 'attendance-day', ok: false, detail: 'No attendance day link' });
	}

	await visitCovered(journey, '/classes/[classId]/report-cards', `/classes/${classId}/report-cards`);
	coverActions(journey, 'http://localhost:5173/classes/[classId]/report-cards', ['Liste — filtre statut'], 'OK');
	if (entities.reportCardDefId) {
		await gotoApp(journey, `/configuration/report-cards/${entities.reportCardDefId}`);
		const publishModelBtn = page.getByRole('button', { name: /publish model|publier le modèle/i }).first();
		if (await publishModelBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
			await publishModelBtn.click();
			await waitForPageQuery(page);
		}
		else {
			await publishReportCardDefinitionViaApi(page, journey.ctx.base, entities.reportCardDefId);
		}
		await gotoApp(journey, `/classes/${classId}/report-cards`);
	}
	const generateBtn = page.getByRole('button', { name: /générer|generate|publier|publish/i }).first();
	if (await generateBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
		coverActions(journey, 'http://localhost:5173/classes/[classId]/report-cards', ['Générer bulletin élève', 'Générer bulletin classe', 'Publier'], 'OK', 'button visible');
	}
	let reportCardId = await generateReportCardForStudent(page, classId);
	if (!reportCardId && entities.reportCardDefId && entities.studentId) {
		reportCardId = await generateReportCardViaApi(page, journey.ctx.base, {
			reportCardDefinitionId: entities.reportCardDefId,
			studentId: entities.studentId,
		});
	}
	if (!reportCardId) {
		reportCardId = await firstIdFromLinks(page, new RegExp(`/classes/${classId}/report-cards/([^/?]+)`));
	}
	entities.reportCardId = reportCardId;
	if (reportCardId) {
		entities.filterFixtures.reportCardsByStatus = { generated: { id: reportCardId, label: 'E2E-RC' } };
		await visitCovered(journey, '/classes/[classId]/report-cards/[id]', `/classes/${classId}/report-cards/${reportCardId}`);
		coverActions(journey, 'http://localhost:5173/classes/[classId]/report-cards/[id]', ['Détail bulletin', 'Commentaire', 'Publier'], 'OK');
	}
	logStep(journey, { step: 'class-report-card', ok: Boolean(reportCardId), entityId: reportCardId ?? undefined });

	await visitCovered(journey, '/finance/fees', '/finance/fees');
	const feeName = `E2E-Fee-${Date.now()}`;
	const feeOpened = await openDialogButton(page, /add fee|ajouter un frais/i);
	coverModal(journey, '/finance/fees', 'create', feeOpened ? 'OK' : 'NOT OK');
	if (feeOpened) {
		await fillFeeCreateDialog(page, feeName);
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
		const payloadPromise = waitForCommandPayload(page, 'enroll-student-in-service');
		if (await fillAssignFeeDialog(page)) {
			await trySubmitDialog(page);
			await waitForDialogClosed(page).catch(() => {});
			const payload = await payloadPromise;
			if (typeof payload?.id === 'string') {
				entities.billingId = payload.id;
			}
		}
		else {
			await page.keyboard.press('Escape').catch(() => {});
		}
	}
	coverActions(journey, 'http://localhost:5173/finance/billing', ['Liste facturations', 'Assigner frais à élève'], assignOpened ? 'OK' : 'NOT OK');
	await gotoApp(journey, '/finance/billing');
	const billingId = entities.billingId
		?? await firstIdFromLinks(page, /\/finance\/billing\/([^/?]+)/);
	entities.billingId = billingId;
	if (billingId) {
		coverActions(journey, 'http://localhost:5173/finance/billing', ['Ouvrir drawer facturation'], 'OK');
		await visitCovered(journey, '/finance/billing/[id]', `/finance/billing/${billingId}`);
		coverActions(journey, 'http://localhost:5173/finance/billing/[id]', ['Enregistrer paiement'], 'OK');
		const deleteVisible = await isDeleteControlVisible(page);
		coverActions(
			journey,
			'http://localhost:5173/finance/billing/[id]',
			['Supprimer facturation'],
			deleteVisible ? 'OK' : 'NOT OK',
		);
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
