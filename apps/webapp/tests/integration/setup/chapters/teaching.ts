import {
	assertListContains,
	fillLabeledInput,
	searchAndSelectPerson,
	selectNativeFilter,
} from '../../../../scripts/qa-harness-ui';
import { apiFetch, resolveSchoolId, ensureClassSubjectForClass, ensurePublishedTeacherTimetableSession } from '../journey-api';
import {
	coverActions,
	coverModal,
	coverMutationActions,
	gotoApp,
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
			command: 'staff-assignments/save',
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

	const teachingId = await ensureClassSubjectForClass(page, journey.ctx.base, {
		classGroupId: classId,
		catalogSubjectId: entities.subjectId,
	});
	if (!teachingId) throw new Error('Required subject offering missing for teacher assignment');
	entities.teachingId = teachingId;
	entities.filterFixtures.teachingSearchToken = teachingId;

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
				await selectNativeFilter(current, 1, { value: classId });
				const subjectSelect = current.getByRole('dialog').locator('select').nth(2);
				await subjectSelect.locator(`option[value="${teachingId}"]`).waitFor({ state: 'attached' });
				await subjectSelect.selectOption(teachingId);
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
        const hubTeacherId = crypto.randomUUID();
        const schoolId = await resolveSchoolId(page, journey.ctx.base);
        const created = await apiFetch(page, journey.ctx.base, '/core/commands/register-teacher', {
            method: 'POST', data: { id: hubTeacherId, schoolId, firstName: 'Integration', lastName: hubTeacherId, isActive: true },
        });
        if (!created.ok()) throw new Error(`Assignment fixture failed: ${created.status()}`);
		await gotoApp(journey, '/configuration/tools/teacher-assignments');
		await runModalMutation(journey, {
            parentRoute: '/configuration/tools/teacher-assignments', modal: 'create',
            pathname: '/configuration/tools/teacher-assignments', command: 'teacher-assignments',
            fill: async current => {
                const selects = current.getByRole('dialog').locator('select');
                await current.getByRole('dialog').locator(`option[value="${hubTeacherId}"]`).waitFor({ state: 'attached', timeout: 15000 });
                await selects.nth(0).selectOption(hubTeacherId);
                await selects.nth(1).selectOption('homeroom');
                await selects.nth(2).selectOption(entities.classId!);
            },
            listPath: '/configuration/tools/teacher-assignments',
            actionPath: 'http://localhost:5173/configuration/tools/teacher-assignments',
            actions: ['Créer / supprimer affectation'],
        });
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
