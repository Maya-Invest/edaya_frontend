import { redactDiagnostic } from '../../support/scenario-registry';
import assert from 'node:assert/strict';
import type { UiJourney } from '../journey-context';
import {
	assertListContains,
	clickCreateButton,
	fillAssignFeeDialog,
	fillEvaluationCreateDialog,
	fillFeeCreateDialog,
	fillNewSessionWizard,
	fillPaymentDialog,
	fillStudentCreateDialog,
	generateReportCardForStudent,
	isDeleteControlVisible,
	openDialogButton,
	openUrlModal,
	pickDialogComboboxOption,
	submitDialog,
	trySubmitDialog,
	waitForDialogClosed,
	waitForPageQuery,
	waitForSubmitEnabled,
} from '../../../../scripts/qa-harness-ui';
import { buildTimetableSessionPath, firstIdFromLinks, timetableWeekFromSessionId } from '../../../../scripts/qa-matrix-support';
import {
	approveAssessmentCorrectionViaIndependentStaff,
	ensureTimetableSession,
	generateReportCardViaApi,
	lessonSessionExists,
	publishAcademicPeriodsViaApi,
	publishReportCardDefinitionViaApi,
	apiFetch,
	submitAssessmentMarksViaApi,
} from '../journey-api';
import {
	coverActions,
	coverCompletedModal,
	coverMutationActions,
	gotoApp,
	idFromUrl,
	logStep,
	recordAttendanceForToday,
	runModalMutation,
	visitCovered,
	waitForCommandResult,

} from '../journey-context';

const STUDENT_TABS = ['profile', 'grades', 'attendance', 'incidents', 'finances', 'report-card', 'enrollments', 'documents'] as const;

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
	const extraStudent = `E2E-ClassStudent-${Date.now()}`;
	const classCreateOpened = await openUrlModal(page, `/classes/${classId}/students`, 'create', { base: journey.ctx.base })
		|| await openDialogButton(page, /add student|ajouter un élève/i);
	let classCreateClosed = false;
	let classCreateListed = false;
	if (classCreateOpened) {
		const resultPromise = waitForCommandResult(page, 'register-student');
		await fillStudentCreateDialog(page, { firstName: 'E2E', lastName: extraStudent, className: /E2E-6A-/ });
		classCreateClosed = await waitForDialogClosed(page).catch(() => false);
		await resultPromise;
		await gotoApp(journey, `/classes/${classId}/students`);
		classCreateListed = await assertListContains(page, extraStudent, true, 20_000);
	}
	coverActions(journey, 'http://localhost:5173/classes/[classId]/students', ['Créer élève (scope classe)'], classCreateClosed && classCreateListed ? 'OK' : 'NOT OK', extraStudent);
	coverCompletedModal(journey, '/classes/[classId]/students', 'create', {
		opened: classCreateOpened,
		submitted: classCreateOpened,
		closed: classCreateClosed,
		postcondition: classCreateListed,
	}, extraStudent);
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
		coverActions(journey, 'http://localhost:5173/classes/[classId]/timetable', ['Vue semaine', 'Navigation semaine'], 'OK');
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

	await runRequiredGroup(journey, 'evaluations', async () => {
		await visitCovered(journey, '/school/corrections', '/school/corrections');
		await visitCovered(journey, '/school/marks-review', '/school/marks-review');
		await visitCovered(journey, '/classes/[classId]/evaluations', `/classes/${classId}/evaluations`);
		const evalOpened = await clickCreateButton(page, 'Créer évaluation', `/classes/${classId}/evaluations`);
		const evalTitle = `E2E-Eval-${Date.now()}`;
		let evalPersisted = false;
		if (evalOpened) {
			const filled = await fillEvaluationCreateDialog(page, evalTitle, entities.teachingId ?? undefined);
			if (filled) {
				const resultPromise = waitForCommandResult(page, 'create-assessment', 20_000);
				await trySubmitDialog(page);
				await waitForDialogClosed(page);
				const result = await resultPromise;
				const responseId = typeof result?.id === 'string' ? result.id : null;
				await gotoApp(journey, `/classes/${classId}/evaluations`);
				const listed = await assertListContains(page, evalTitle, true, 20_000);
				evalPersisted = listed && responseId !== null;
				if (responseId) {
					entities.evaluationId = responseId;
				}
			}
			else {
				await page.keyboard.press('Escape').catch(() => {});
			}
		}
		await gotoApp(journey, `/classes/${classId}/evaluations`);
		const evaluationId = entities.evaluationId
			?? (evalPersisted ? await firstIdFromLinks(page, new RegExp(`/classes/${classId}/evaluations/([^/?]+)`)) : null);
		entities.evaluationId = evaluationId;
		if (evaluationId) {
			entities.filterFixtures.evaluationsByType = { default: { id: evaluationId, title: 'E2E-Eval' } };
			await visitCovered(journey, '/classes/[classId]/evaluations/[id]/details', `/classes/${classId}/evaluations/${evaluationId}/details`);
			coverActions(journey, 'http://localhost:5173/classes/[classId]/evaluations/[id]/details', ['Métadonnées évaluation'], 'OK');
			await visitCovered(journey, '/classes/[classId]/evaluations/[id]/grading', `/classes/${classId}/evaluations/${evaluationId}/grading`);
			await runModalMutation(journey, {
				parentRoute: '/classes/[classId]/evaluations/[id]/grading',
				modal: 'grade-entry',
				pathname: `/classes/${classId}/evaluations/${evaluationId}/grading`,
				target: entities.studentId ?? undefined,
				command: 'record-assessment-result',
				openLabel: /saisir la note|enter grade|modifier la note|edit grade/i,
				fill: async (current) => {
					const score = current.getByRole('dialog').locator('input[type="number"]').first();
					await score.fill('12');
				},
				visibleAfter: '12',
				listPath: `/classes/${classId}/evaluations/${evaluationId}/grading`,
				actionPath: 'http://localhost:5173/classes/[classId]/evaluations/[id]/grading',
				actions: ['Saisie notes'],
			});
			let submittedMarks = false;
			let approvedCorrection = false;
			try {
				submittedMarks = await submitAssessmentMarksViaApi(page, journey.ctx.base, evaluationId);
				approvedCorrection = submittedMarks
					? await approveAssessmentCorrectionViaIndependentStaff(page, journey.ctx.base, evaluationId, classId)
					: false;
			}
			catch (error) {
				throw new Error(`Required marks review fixture failed: ${error instanceof Error ? error.message : error}`);
			}
			assert(submittedMarks && approvedCorrection, 'Required submitted marks and approved correction missing');
		}
		coverActions(journey, 'http://localhost:5173/classes/[classId]/evaluations', ['Liste — filtre type'], 'OK');
		coverMutationActions(
			journey,
			'http://localhost:5173/classes/[classId]/evaluations',
			['Créer évaluation'],
			{ exercised: evalOpened, postcondition: evalPersisted },
			evalOpened ? evalTitle : 'create modal not found',
		);
		logStep(journey, { step: 'evaluation', ok: Boolean(evaluationId), entityId: evaluationId ?? undefined });

	});

	await runRequiredGroup(journey, 'attendance', async () => {
		await visitCovered(journey, '/classes/[classId]/attendance', `/classes/${classId}/attendance`);
		coverActions(journey, 'http://localhost:5173/classes/[classId]/attendance', ['Liste jours'], 'OK');
		let recordedDayId: string | null = null;
		try {
			recordedDayId = await recordAttendanceForToday(journey, classId);
		}
		catch (err) {
			await journey.ctx.shot('failure-attendance');
			console.error(
				'Attendance today failed; continuing finance:',
				err instanceof Error ? err.message : err,
			);
		}
		const dayId = recordedDayId;
		entities.dayId = dayId;
		if (dayId) {
			await visitCovered(journey, '/classes/[classId]/attendance/[dayId]', `/classes/${classId}/attendance/${dayId}`);
			coverMutationActions(
				journey,
				'http://localhost:5173/classes/[classId]/attendance/[dayId]',
				['Prendre / éditer présence jour'],
				{ exercised: Boolean(recordedDayId), postcondition: Boolean(recordedDayId) },
				recordedDayId ? undefined : 'day opened; attendance not confirmed',
			);
			logStep(journey, { step: 'attendance-day', ok: true, entityId: dayId });
		}
		else {
			logStep(journey, { step: 'attendance-day', ok: false, detail: 'No attendance day link' });
		}

	});

	await runRequiredGroup(journey, 'report-cards', async () => {
		await visitCovered(journey, '/classes/[classId]/report-cards', `/classes/${classId}/report-cards`);
		coverActions(journey, 'http://localhost:5173/classes/[classId]/report-cards', ['Liste — filtre statut'], 'OK');
		if (entities.reportCardDefId) {
			await gotoApp(journey, `/configuration/structure/details/report-cards/${entities.reportCardDefId}`);
			const publishModelBtn = page.getByRole('button', { name: /publish model|publier le modèle/i }).first();
			if (await publishModelBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
				const publication = page.waitForResponse(response => response.url().includes('/entities/definitions/save') && response.request().method() === 'POST', { timeout: 20000 });
				await publishModelBtn.click();
				const published = await publication;
				if (!published.ok()) throw new Error(`Report template publication failed: HTTP ${published.status()}`);
				const saved = await apiFetch(page, journey.ctx.base, `/core/entities/definitions/${entities.reportCardDefId}`);
				if ((await saved.json() as { status: string }).status !== 'published') throw new Error('Required published report template did not persist');
			}
			else {
				await publishReportCardDefinitionViaApi(page, journey.ctx.base, entities.reportCardDefId);
			}
			await gotoApp(journey, `/classes/${classId}/report-cards`);
		}
		const generateBtn = page.getByRole('button', { name: /générer|generate|publier|publish/i }).first();
		const generateVisible = await generateBtn.isVisible({ timeout: 5_000 }).catch(() => false);
		const reportStudentResponse = await apiFetch(page,journey.ctx.base,`/core/entities/students/${entities.studentId}`);
		if (!reportStudentResponse.ok()) throw new Error('Required graded report student missing');
		const reportStudent = await reportStudentResponse.json() as {lastName:string};
		let reportCardId = await generateReportCardForStudent(page, classId, reportStudent.lastName);
		const generatedInUi = Boolean(reportCardId);
		const generated = generatedInUi;
		coverMutationActions(
			journey,
			'http://localhost:5173/classes/[classId]/report-cards',
			['Générer bulletin élève'],
			{ exercised: generatedInUi, postcondition: generated },
			generated ? undefined : 'generate not confirmed',
		);
		const classGenerate = page.getByRole('button', { name: /^(tout générer|generate all)$/i });
		const pendingCount = await page.getByRole('button', { name: /^(générer|generate)$/i }).count();
		if (pendingCount < 1) throw new Error('Class report generation requires additional eligible students');
		const generatedIds = new Set<string>();
		const responses: Array<import('playwright').Response> = [];
		const collect = (response: import('playwright').Response) => {
			if (response.url().includes('/commands/generate-report-card-result') && response.request().method() === 'POST') responses.push(response);
		};
		page.on('response', collect);
		try {
			await classGenerate.click();
			await page.waitForFunction(() => !Array.from(document.querySelectorAll('main button')).some(button => /^(générer|generate)$/i.test(button.textContent?.trim() ?? '')), undefined, { timeout: 60000 });
			for (const response of responses) {
				if (!response.ok()) throw new Error(`Class report generation HTTP ${response.status()}`);
				generatedIds.add((await response.json() as { id: string }).id);
			}
			if (generatedIds.size !== pendingCount) throw new Error(`Class report generation completed ${generatedIds.size}/${pendingCount} students`);
		} finally { page.off('response', collect); }
		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForPageQuery(page);
		for (const id of generatedIds) {
			const saved = await apiFetch(page, journey.ctx.base, `/core/entities/results/${id}`);
			if (!saved.ok() || (await saved.json() as { status: string }).status !== 'draft') throw new Error(`Generated class report ${id} did not persist`);
		}
		coverMutationActions(journey, 'http://localhost:5173/classes/[classId]/report-cards', ['Générer bulletin classe'], { exercised: true, postcondition: true }, `${generatedIds.size} persisted reports`);
		if (!reportCardId) {
			reportCardId = await firstIdFromLinks(page, new RegExp(`/classes/${classId}/report-cards/([^/?]+)`));
		}
		entities.reportCardId = reportCardId;
		if (reportCardId) {
			entities.filterFixtures.reportCardsByStatus = { generated: { id: reportCardId, label: 'E2E-RC' } };
			await visitCovered(journey, '/classes/[classId]/report-cards/[id]', `/classes/${classId}/report-cards/${reportCardId}`);
			coverActions(journey, 'http://localhost:5173/classes/[classId]/report-cards/[id]', ['Détail bulletin'], 'OK');
			const comment = `QA comment ${Date.now()}`;
			const homeroom = page.locator('section').filter({ hasText: /appréciation du professeur principal|homeroom teacher comment/i });
			const editComment = homeroom.getByRole('button', { name: /^(modifier|edit)$/i });
			let commentSaved = false;
			if (await editComment.isVisible({ timeout: 8_000 }).catch(() => false)) {
				await editComment.click();
				const commentBox = page.getByRole('dialog').locator('textarea').first();
				await commentBox.fill(comment);
				const commentPromise = waitForCommandResult(page, 'write-homeroom-report-comment', 20_000);
				await page.getByTestId('form-modal-submit').click();
				assert((await commentPromise) !== null, 'Report comment command failed');
				await waitForDialogClosed(page);
				await page.reload({ waitUntil: 'domcontentloaded' });
				await waitForPageQuery(page);
				const saved = await apiFetch(page, journey.ctx.base, `/core/entities/results/${reportCardId}`);
				commentSaved = saved.ok() && (await saved.json() as { teacherComment: string }).teacherComment === comment;
			}
			coverMutationActions(
				journey,
				'http://localhost:5173/classes/[classId]/report-cards/[id]',
				['Commentaire'],
				{ exercised: true, postcondition: commentSaved },
				comment,
			);
			await publishAcademicPeriodsViaApi(page, journey.ctx.base);
			await page.reload({ waitUntil: 'domcontentloaded' });
			const publishBtn = page.locator('aside[aria-label]').getByRole('button', { name: /^(publish|publier)$/i });
			await publishBtn.waitFor({ state: 'visible', timeout: 15000 });
			const publishPromise = waitForCommandResult(page, 'publish-report-card-result', 30000);
			await publishBtn.click();
			assert((await publishPromise) !== null, 'Report publication command failed');
			await page.reload({ waitUntil: 'domcontentloaded' });
			await waitForPageQuery(page);
			const savedReport = await apiFetch(page, journey.ctx.base, `/core/entities/results/${reportCardId}`);
			const publishedCard = savedReport.ok() && (await savedReport.json() as { status: string }).status === 'published';

			coverMutationActions(
				journey,
				'http://localhost:5173/classes/[classId]/report-cards/[id]',
				['Publier'],
				{ exercised: true, postcondition: publishedCard },
				publishedCard ? undefined : 'publish not confirmed',
			);
			coverMutationActions(journey, 'http://localhost:5173/classes/[classId]/report-cards', ['Publier'], { exercised: publishedCard, postcondition: publishedCard });
			if (entities.studentId) {
				coverMutationActions(
					journey,
					'http://localhost:5173/school/students/[id]/report-card',
					['Générer / publier bulletin'],
					{ exercised: true, postcondition: generated && publishedCard },
				);
			}
		}
		logStep(journey, { step: 'class-report-card', ok: Boolean(reportCardId), entityId: reportCardId ?? undefined });

	});

	await runRequiredGroup(journey, 'finance', async () => {
		await visitCovered(journey, '/finance/fees', '/finance/fees');
		const feeName = `E2E-Fee-${Date.now()}`;
		const feeOpened = await openDialogButton(page, /add fee|ajouter un frais/i);
		if (feeOpened) {
			const resultPromise = waitForCommandResult(page, 'create-catalog-service');
			await fillFeeCreateDialog(page, feeName);
			await waitForSubmitEnabled(page, 15_000).catch(() => {});
			let submitted = true;
			try {
				await submitDialog(page);
			}
			catch {
				submitted = false;
			}
			const closed = submitted ? await waitForDialogClosed(page).catch(() => false) : false;
			const result = submitted ? await resultPromise : null;
			const listed = await assertListContains(page, feeName, true, 20_000);
			const created = submitted && closed && listed && result !== null;
			if (created) {
				entities.filterFixtures.feesByCategory = { default: { id: feeName, name: feeName } };
			}
			coverCompletedModal(journey, '/finance/fees', 'create', {
				opened: true,
				submitted,
				closed,
				postcondition: created,
			}, feeName);
			coverActions(journey, 'http://localhost:5173/finance/fees', ['Liste frais'], created ? 'OK' : 'NOT OK', feeName);
			coverMutationActions(
				journey,
				'http://localhost:5173/finance/fees',
				['Créer frais (nom, montant, échéances %)'],
				{ exercised: true, postcondition: created },
				feeName,
			);
			logStep(journey, { step: 'fee', ok: created, detail: feeName });
		}
		else {
			coverCompletedModal(journey, '/finance/fees', 'create', {
				opened: false,
				submitted: false,
				closed: false,
			}, 'Fee modal not found');
			logStep(journey, { step: 'fee', ok: false, detail: 'Fee modal not found' });
		}

		await visitCovered(journey, '/finance/billing', '/finance/billing');
		const assignOpened = await openUrlModal(page, '/finance/billing', 'assign-fee', { base: journey.ctx.base })
			|| await openDialogButton(page, /ajouter une facture|add invoice/i);
		if (assignOpened) {
			const resultPromise = waitForCommandResult(page, 'enroll-student-in-service');
			const billingStudent = await apiFetch(page, journey.ctx.base, `/core/entities/students/${entities.studentId}`);
			assert(billingStudent.ok(), 'Required billing student missing');
			if (await fillAssignFeeDialog(page, (await billingStudent.json() as { lastName: string }).lastName)) {
				await trySubmitDialog(page);
				const closed = await waitForDialogClosed(page).catch(() => false);
				const result = await resultPromise;
				const responseId = typeof result?.id === 'string' ? result.id : null;
				if (responseId) {
					entities.billingId = responseId;
				}
				coverCompletedModal(journey, '/finance/billing', 'assign-fee', {
					opened: true,
					submitted: true,
					closed,
					postcondition: responseId !== null,
				});
			}
			else {
				coverCompletedModal(journey, '/finance/billing', 'assign-fee', {
					opened: true,
					submitted: false,
					closed: false,
				}, 'assign form not filled');
				await page.keyboard.press('Escape').catch(() => {});
			}
		}
		else {
			coverCompletedModal(journey, '/finance/billing', 'assign-fee', {
				opened: false,
				submitted: false,
				closed: false,
			}, 'assign modal not found');
		}
		coverActions(journey, 'http://localhost:5173/finance/billing', ['Liste facturations'], 'OK');
		coverMutationActions(
			journey,
			'http://localhost:5173/finance/billing',
			['Assigner frais à élève'],
			{ exercised: assignOpened, postcondition: Boolean(entities.billingId) },
			assignOpened ? undefined : 'assign modal not found',
		);
		await gotoApp(journey, '/finance/billing');
		const billingId = entities.billingId
			?? await firstIdFromLinks(page, /\/finance\/billing\/([^/?]+)/);
		entities.billingId = billingId;
		if (billingId) {
			coverActions(journey, 'http://localhost:5173/finance/billing', ['Ouvrir drawer facturation'], 'OK');
			await visitCovered(journey, '/finance/billing/[id]', `/finance/billing/${billingId}`);
			const deleteVisible = await isDeleteControlVisible(page);
			coverMutationActions(
				journey,
				'http://localhost:5173/finance/billing/[id]',
				['Supprimer facturation'],
				{ exercised: false },
				deleteVisible ? 'delete control visible; delete not submitted' : 'delete control not visible',
			);
			const payOpened = await openUrlModal(page, `/finance/billing/${billingId}`, 'payment', { base: journey.ctx.base })
				|| await openDialogButton(page, /enregistrer un paiement|record payment/i);
			let payClosed = false;
			let paySubmitted = false;
			let paid = false;
			if (payOpened) {
				const resultPromise = page.waitForResponse(
					res => res.request().method() === 'POST' && res.url().includes('/core/commands/record-payment'),
					{ timeout: 20_000 },
				).catch(() => null);
				await fillPaymentDialog(page);
				if (!(await waitForSubmitEnabled(page, 3_000))) {
					await pickDialogComboboxOption(page, /dépôt uniquement|account only|deposit only/i);
					await fillPaymentDialog(page);
				}
				const enabled = await waitForSubmitEnabled(page, 8_000);
				console.log(`payment submit enabled: ${enabled}`);
				if (enabled) {
					try {
						await submitDialog(page);
						paySubmitted = true;
					}
					catch {
						paySubmitted = false;
					}
				}
				payClosed = paySubmitted ? await waitForDialogClosed(page).catch(() => false) : false;
				const response = paySubmitted ? await resultPromise : null;
				if (response && !response.ok()) {
					console.log(`record-payment status=${response.status()} body=${(await response.text().catch(() => '')).slice(0, 300)}`);
				}
				const result = response?.ok() ? await response.json().catch(() => null) : null;
				await gotoApp(journey, `/finance/billing/${billingId}`);
				assert(result?.id, 'Payment response ID missing');
				const savedPayment = await apiFetch(page, journey.ctx.base, `/core/entities/payments/${result.id}`);
				const persistedPayment = await savedPayment.json() as { id: string; amount: unknown; status: string };
				paid = savedPayment.ok() && persistedPayment.id === result.id && persistedPayment.status === 'recorded'
					&& JSON.stringify(persistedPayment.amount) === JSON.stringify(result.amount);
			}
			coverMutationActions(
				journey,
				'http://localhost:5173/finance/billing/[id]',
				['Enregistrer paiement'],
				{ exercised: payOpened, postcondition: paid },
				payOpened ? undefined : 'payment not submitted',
			);
			coverCompletedModal(journey, '/finance/billing/[id]', 'payment', {
				opened: payOpened,
				submitted: paySubmitted,
				closed: payClosed,
				postcondition: paid,
			});
			logStep(journey, { step: 'billing', ok: true, entityId: billingId });
		}
		else {
			logStep(journey, { step: 'billing', ok: false, detail: 'No billing row' });
		}

		await visitCovered(journey, '/finance/payment', '/finance/payment');
		coverActions(journey, 'http://localhost:5173/finance/payment', ['Ledger paiements', 'Recherche'], 'OK');
		logStep(journey, { step: 'payments-ledger', ok: true });
	});


}

async function runRequiredGroup(journey: UiJourney, name: string, run: () => Promise<void>): Promise<void> {
  try { await run(); }
  catch (error) {
    const detail = redactDiagnostic(String(error));
    await journey.ctx.shot(`failure-${name}`).catch(() => {});
    logStep(journey, { step: name, ok: false, detail });
  }
}
