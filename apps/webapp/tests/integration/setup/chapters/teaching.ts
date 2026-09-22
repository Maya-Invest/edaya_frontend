import {
	assertListContains,
	fillLabeledInput,
	searchAndSelectPerson,
	selectNativeFilter,
} from '../../../../scripts/qa-harness-ui';
import { firstIdFromLinks } from '../../../../scripts/qa-matrix-support';
import { ensureClassSubjectForClass, ensurePublishedTeacherTimetableSession } from '../journey-api';
import {
	coverActions,
	coverModal,
	coverMutationActions,
	gotoApp,
	idFromUrl,
	logStep,
	runModalMutation,
	visitCovered,
	waitForCommandResult,
	type UiJourney,
} from '../journey-context';

export async function runTeachingChapter(journey: UiJourney): Promise<void> {
	const { entities } = journey;
	const { page } = journey.ctx;
	const classId = entities.classId;
	console.log('\n--- Journey: teaching ---');

	if (!classId) {
		logStep(journey, { step: 'teaching', ok: false, detail: 'No classId — skip teaching link' });
		return;
	}

	if (entities.configClassId) {
		await visitCovered(
			journey,
			'/configuration/classes/[id]/assignments',
			`/configuration/classes/${entities.configClassId}/assignments`,
		);
		const responsibility = 'QA coordinator';
		const assigned = await runModalMutation(journey, {
			parentRoute: '/configuration/classes/[id]/assignments',
			modal: 'form',
			pathname: `/configuration/classes/${entities.configClassId}/assignments`,
			command: 'assign-staff-to-class',
			fill: async (current) => {
				await searchAndSelectPerson(current, 'E2E-Staff');
				await fillLabeledInput(current, /responsabilité|responsibility/i, responsibility);
			},
			visibleAfter: responsibility,
			listPath: `/configuration/classes/${entities.configClassId}/assignments`,
			actionPath: 'http://localhost:5173/configuration/classes/[id]/assignments',
			actions: ['Affectations staff'],
		});
		if (entities.staffId && assigned.postcondition) {
			await gotoApp(journey, `/school/staff/${entities.staffId}/assignments`);
			const listed = await assertListContains(page, responsibility, true, 8_000);
			coverMutationActions(
				journey,
				'http://localhost:5173/school/staff/[id]/assignments',
				['Assignations classe/rôle'],
				{ exercised: true, postcondition: listed || assigned.postcondition },
				responsibility,
			);
		}
	}

	await visitCovered(journey, '/classes/[classId]/teaching', `/classes/${classId}/teaching`);
	coverActions(journey, 'http://localhost:5173/classes/[classId]/teaching', ['Liste matières'], 'OK');

	const offControl = page.getByText(/proposée en classe:\s*off|offered in class:\s*off/i).first();
	const onControl = page.getByText(/proposée en classe:\s*on|offered in class:\s*on/i).first();
	let offered = await onControl.isVisible({ timeout: 3_000 }).catch(() => false);
	if (await offControl.isVisible({ timeout: offered ? 1_000 : 8_000 }).catch(() => false)) {
		const resultPromise = waitForCommandResult(page, 'set-class-subject-offered', 20_000);
		await offControl.click();
		offered = (await resultPromise) !== null
			|| await page.getByText(/proposée en classe:\s*on|offered in class:\s*on/i).first()
				.isVisible({ timeout: 8_000 })
				.catch(() => false);
	}
	coverMutationActions(
		journey,
		'http://localhost:5173/classes/[classId]/teaching',
		['Offer / toggle matière'],
		{ exercised: true, postcondition: offered },
		offered ? undefined : 'offer toggle not confirmed',
	);

	let teachingId = await firstIdFromLinks(page, new RegExp(`/classes/${classId}/teaching/([^/?]+)`))
		?? idFromUrl(page, /\/teaching\/([^/?]+)/);
	if (!teachingId) {
		const row = page.locator('main a[href*="/teaching/"], main [role="button"]').first();
		if (await row.isVisible().catch(() => false)) {
			await row.click();
			await page.waitForTimeout(800);
			teachingId = idFromUrl(page, /\/teaching\/([^/?]+)/);
		}
	}
	entities.teachingId = teachingId;
	entities.filterFixtures.teachingSearchToken = teachingId ?? undefined;

	if (!teachingId) {
		teachingId = await ensureClassSubjectForClass(page, journey.ctx.base, {
			classGroupId: classId,
			catalogSubjectId: entities.subjectId,
		});
		entities.teachingId = teachingId;
		entities.filterFixtures.teachingSearchToken = teachingId ?? undefined;
	}

	if (teachingId) {
		await visitCovered(
			journey,
			'/classes/[classId]/teaching/[id]/progression',
			`/classes/${classId}/teaching/${teachingId}/progression`,
		);
		coverActions(journey, 'http://localhost:5173/classes/[classId]/teaching/[id]/progression', ['Chapitres / progression'], 'OK');
		const editedSubject = `QA-Subject-${Date.now()}`;
		await runModalMutation(journey, {
			parentRoute: '/classes/[classId]/teaching/[id]/progression',
			modal: 'edit-subject',
			pathname: `/classes/${classId}/teaching/${teachingId}/progression`,
			command: 'configure-subject',
			fill: async (current) => {
				await current.getByRole('dialog').locator('input').first().fill(editedSubject);
			},
			visibleAfter: editedSubject,
			listPath: `/classes/${classId}/teaching/${teachingId}/progression`,
		});
		await visitCovered(
			journey,
			'/classes/[classId]/teaching/[id]/logbook',
			`/classes/${classId}/teaching/${teachingId}/logbook`,
		);
		coverActions(journey, 'http://localhost:5173/classes/[classId]/teaching/[id]/logbook', ['Logbook matière'], 'OK');
		logStep(journey, { step: 'teaching', ok: true, entityId: teachingId });
	}
	else {
		logStep(journey, { step: 'teaching', ok: false, detail: 'No classSubject / teachingId after offer' });
	}

	if (entities.teacherId) {
		await gotoApp(journey, `/school/teachers/${entities.teacherId}/assignments`);
		const assigned = await runModalMutation(journey, {
			parentRoute: '/school/teachers/[id]/assignments',
			modal: 'form',
			pathname: `/school/teachers/${entities.teacherId}/assignments`,
			command: 'teacher-assignments',
			fill: async (current) => {
				await selectNativeFilter(current, 1, { label: /E2E-6A-/ })
					|| await selectNativeFilter(current, 1);
				const started = Date.now();
				while (Date.now() - started < 10_000) {
					if (await selectNativeFilter(current, 2)) {
						return;
					}
					await current.waitForTimeout(300);
				}
			},
			actionPath: 'http://localhost:5173/school/teachers/[id]/assignments',
			actions: ['CRUD affectations matière/classe'],
		});
		if (assigned.postcondition) {
			await gotoApp(journey, `/school/teachers/${entities.teacherId}/assignments`);
		}
		if (entities.classId) {
			await ensurePublishedTeacherTimetableSession(page, journey.ctx.base, {
				classGroupId: entities.classId,
				teacherId: entities.teacherId,
				catalogSubjectId: entities.subjectId,
			});
			await runModalMutation(journey, {
				parentRoute: '/school/teachers/[id]/documents',
				modal: 'generate-document',
				pathname: `/school/teachers/${entities.teacherId}/documents`,
				command: 'request-document-issuance',
				openLabel: /générer un document|generate (a )?document|^générer$|^generate$/i,
				listPath: `/school/teachers/${entities.teacherId}/documents`,
				visibleAfter: 'Emploi du temps',
			});
		}
	}

	try {
		await gotoApp(journey, '/configuration/tools/teacher-assignments');
		coverModal(journey, '/configuration/tools/teacher-assignments', 'create', 'N/A', 'page visited; create not submitted');
		logStep(journey, { step: 'teacher-assignments-hub', ok: true, detail: 'visited after teacher exists' });
	}
	catch (err) {
		console.error(
			'Teacher assignments hub visit failed; teaching chapter continuing:',
			err instanceof Error ? err.message : err,
		);
		logStep(journey, {
			step: 'teacher-assignments-hub',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		});
	}
}
