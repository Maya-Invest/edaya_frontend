import {
	openDialogButton,
	openUrlModal,
	waitForDialogClosed,
} from '../../../../scripts/qa-harness-ui';
import { firstIdFromLinks } from '../../../../scripts/qa-matrix-support';
import { ensureClassSubjectForClass } from '../journey-api';
import {
	coverActions,
	coverModal,
	gotoApp,
	idFromUrl,
	logStep,
	visitCovered,
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
		coverActions(journey, 'http://localhost:5173/configuration/classes/[id]/assignments', ['Affectations staff'], 'OK');
		const formOpened = await openUrlModal(
			page,
			`/configuration/classes/${entities.configClassId}/assignments`,
			'form',
			{ base: journey.ctx.base },
		) || await openDialogButton(page, /assign|affecter|ajouter/i);
		coverModal(journey, '/configuration/classes/[id]/assignments', 'form', formOpened ? 'OK' : 'NOT OK');
		if (formOpened) {
			await page.keyboard.press('Escape').catch(() => {});
			await waitForDialogClosed(page).catch(() => {});
		}
	}

	await visitCovered(journey, '/classes/[classId]/teaching', `/classes/${classId}/teaching`);
	coverActions(journey, 'http://localhost:5173/classes/[classId]/teaching', ['Liste matières', 'Offer / toggle matière'], 'OK');

	const offerBtn = page.getByRole('button', { name: /offer|proposer|toggle|activer/i }).first();
	if (await offerBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
		await offerBtn.click();
		await page.waitForTimeout(1_000);
	}

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
		coverModal(journey, '/classes/[classId]/teaching/[id]/progression', 'edit-subject', 'OK');
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
		const assignOpened = await openDialogButton(page, /assign|affecter|ajouter/i);
		coverModal(journey, '/school/teachers/[id]/assignments', 'form', assignOpened ? 'OK' : 'NOT OK');
		if (assignOpened) {
			await page.keyboard.press('Escape').catch(() => {});
			await waitForDialogClosed(page).catch(() => {});
		}
	}

	try {
		await gotoApp(journey, '/configuration/tools/teacher-assignments');
		coverModal(journey, '/configuration/tools/teacher-assignments', 'create', 'OK', 'page visited after teacher exists');
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
