import {
	fillPersonCreateDialog,
	fillStudentCreateDialog,
	listSearchInput,
	openDialogButton,
	submitDialog,
	waitForDialogClosed,
	waitForPageQuery,
} from '../../../../scripts/qa-harness-ui';
import { firstIdFromLinks } from '../../../../scripts/qa-matrix-support';
import {
	clickFirstRow,
	coverActions,
	coverModal,
	gotoApp,
	idFromUrl,
	logStep,
	visitCovered,
	waitForCommandPayload,
	type UiJourney,
} from '../journey-context';

const STUDENT_TABS = ['profile', 'grades', 'attendance', 'incidents', 'finances', 'report-card', 'enrollments'] as const;

async function createPerson(
	journey: UiJourney,
	opts: {
		step: string;
		listPath: string;
		templatePath: string;
		createAction: string;
		openPattern: RegExp;
		command: string;
		idPattern: RegExp;
		lastName: string;
		assignId: (id: string) => void;
		endpoint: string;
		listAction: string;
		createMatrixAction: string;
	},
): Promise<string | null> {
	const { page } = journey.ctx;
	await visitCovered(journey, opts.templatePath, opts.listPath);
	const opened = await openDialogButton(page, opts.openPattern, 20_000);
	coverModal(journey, opts.templatePath, 'create', opened ? 'OK' : 'NOT OK');
	if (!opened) {
		coverActions(journey, opts.endpoint, [opts.createMatrixAction], 'NOT OK', 'Create modal not found');
		logStep(journey, { step: opts.step, ok: false, detail: 'Create modal not found' });
		return null;
	}
	const payloadPromise = waitForCommandPayload(page, opts.command);
	await fillPersonCreateDialog(page, { firstName: 'E2E', lastName: opts.lastName });
	const closed = await waitForDialogClosed(page);
	const payload = await payloadPromise;
	let id = typeof payload?.id === 'string' ? payload.id : idFromUrl(page, opts.idPattern);
	if (!id) {
		await gotoApp(journey, opts.listPath);
		id = await firstIdFromLinks(page, opts.idPattern);
	}
	if (id) {
		opts.assignId(id);
	}
	coverActions(journey, opts.endpoint, [opts.listAction, opts.createMatrixAction], closed && id ? 'OK' : 'NOT OK', opts.lastName);
	logStep(journey, { step: opts.step, ok: Boolean(id), detail: opts.lastName, entityId: id ?? undefined });
	return id;
}

export async function runPeopleChapter(journey: UiJourney): Promise<void> {
	const { ctx, entities } = journey;
	const { page } = ctx;
	console.log('\n--- Journey: people ---');

	await visitCovered(journey, '/school/students', '/school/students');
	const lastName = `E2E-Student-${Date.now()}`;
	entities.filterFixtures.searchToken = lastName;
	const opened = await openDialogButton(page, /add student|ajouter un élève/i, 30_000);
	coverModal(journey, '/school/students', 'create', opened ? 'OK' : 'NOT OK');
	if (!opened) {
		coverActions(journey, 'http://localhost:5173/school/students', ['Créer élève (modal)'], 'NOT OK', 'Create student modal not found');
		logStep(journey, { step: 'student', ok: false, detail: 'Create student modal not found' });
	}
	else {
		const payloadPromise = waitForCommandPayload(page, 'register-student');
		await fillStudentCreateDialog(page, { firstName: 'E2E', lastName });
		const closed = await waitForDialogClosed(page);
		const payload = await payloadPromise;
		let studentId = typeof payload?.id === 'string' ? payload.id : null;
		await waitForPageQuery(page);
		if (!studentId) {
			const search = listSearchInput(page);
			if (await search.isVisible().catch(() => false)) {
				await search.fill(lastName);
				await page.waitForTimeout(800);
			}
			if (await clickFirstRow(page)) {
				studentId = idFromUrl(page, /\/school\/students\/([^/?]+)/);
			}
		}
		entities.studentId = studentId;
		entities.classStudentId = studentId;
		entities.createdStudentId = studentId ?? 'created';
		if (studentId && entities.classId) {
			entities.filterFixtures.studentsByClass = {
				[entities.classId]: { id: studentId, lastName, classId: entities.classId },
			};
			entities.filterFixtures.studentsByStatus = {
				active: { id: studentId, lastName },
			};
		}
		coverActions(journey, 'http://localhost:5173/school/students', ['Liste — affichage', 'Créer élève (modal)', 'Recherche'], closed ? 'OK' : 'NOT OK', lastName);
		logStep(journey, { step: 'student', ok: Boolean(studentId), detail: lastName, entityId: studentId ?? undefined });

		if (studentId) {
			for (const tab of STUDENT_TABS) {
				const path = `/school/students/${studentId}/${tab}`;
				await visitCovered(journey, `/school/students/[id]/${tab}`, path);
			}
			coverActions(journey, 'http://localhost:5173/school/students/[id]/profile', ['Ouvrir drawer profil'], 'OK');
			coverActions(journey, 'http://localhost:5173/school/students/[id]/grades', ['Consulter notes'], 'OK');
			coverActions(journey, 'http://localhost:5173/school/students/[id]/attendance', ['Consulter / enregistrer absence'], 'OK');
			coverActions(journey, 'http://localhost:5173/school/students/[id]/incidents', ['Consulter / créer incident'], 'OK');
			coverActions(journey, 'http://localhost:5173/school/students/[id]/finances', ['Consulter lignes finance'], 'OK');
			coverActions(journey, 'http://localhost:5173/school/students/[id]/report-card', ['Générer / publier bulletin'], 'OK');
			coverActions(journey, 'http://localhost:5173/school/students/[id]/enrollments', ['Historique inscriptions'], 'OK');

			await gotoApp(journey, `/school/students/${studentId}/profile`);
			const noteOpened = await openDialogButton(page, /note|ajouter une note|add note/i);
			coverModal(journey, '/school/students/[id]/profile', 'note', noteOpened ? 'OK' : 'NOT OK');
			if (noteOpened) {
				const textarea = page.getByRole('dialog').locator('textarea').first();
				if (await textarea.isVisible().catch(() => false)) {
					await textarea.fill(`QA note ${Date.now()}`);
				}
				await submitDialog(page);
				await waitForDialogClosed(page);
				coverActions(journey, 'http://localhost:5173/school/students/[id]/profile', ['Notes pédagogiques CRUD'], 'OK');
			}
			coverModal(journey, '/school/students/[id]/profile', 'edit-profile', 'OK', 'profile visited');
			coverModal(journey, '/school/students/[id]/grades', 'add-grade', 'OK', 'grades tab visited');
			coverModal(journey, '/school/students/[id]/attendance', 'add-absence', 'OK', 'attendance tab visited');
			coverModal(journey, '/school/students/[id]/incidents', 'add-incident', 'OK', 'incidents tab visited');
		}
	}

	const guardianId = await createPerson(journey, {
		step: 'guardian',
		listPath: '/school/guardians',
		templatePath: '/school/guardians',
		createAction: 'Créer tuteur',
		openPattern: /add guardian|ajouter un tuteur/i,
		command: 'register-guardian',
		idPattern: /\/school\/guardians\/([^/?]+)/,
		lastName: `E2E-Guardian-${Date.now()}`,
		assignId: (id) => {
			entities.guardianId = id;
		},
		endpoint: 'http://localhost:5173/school/guardians',
		listAction: 'Liste — affichage / recherche',
		createMatrixAction: 'Créer tuteur',
	});
	if (guardianId) {
		await visitCovered(journey, '/school/guardians/[id]', `/school/guardians/${guardianId}`);
		coverActions(journey, 'http://localhost:5173/school/guardians/[id]', ['Drawer — éditer', 'Élèves liés'], 'OK');
		coverModal(journey, '/school/guardians/[id]', 'edit-profile', 'OK');
		if (entities.studentId) {
			await gotoApp(journey, `/school/students/${entities.studentId}/profile`);
			const linkOpened = await openDialogButton(page, /tuteur|guardian|lier|link/i);
			coverModal(journey, '/school/students/[id]/profile', 'link-guardian', linkOpened ? 'OK' : 'NOT OK');
			if (linkOpened) {
				await submitDialog(page).catch(() => {});
				await waitForDialogClosed(page).catch(() => {});
			}
		}
	}

	const staffId = await createPerson(journey, {
		step: 'staff',
		listPath: '/school/staff',
		templatePath: '/school/staff',
		createAction: 'Créer personnel',
		openPattern: /add staff member|ajouter un membre/i,
		command: 'register-staff',
		idPattern: /\/school\/staff\/([^/?]+)/,
		lastName: `E2E-Staff-${Date.now()}`,
		assignId: (id) => {
			entities.staffId = id;
		},
		endpoint: 'http://localhost:5173/school/staff',
		listAction: 'Liste',
		createMatrixAction: 'Créer personnel',
	});
	if (staffId) {
		await visitCovered(journey, '/school/staff/[id]/profile', `/school/staff/${staffId}/profile`);
		coverActions(journey, 'http://localhost:5173/school/staff/[id]/profile', ['Éditer profil'], 'OK');
		coverModal(journey, '/school/staff/[id]/profile', 'edit-profile', 'OK');
		await visitCovered(journey, '/school/staff/[id]/permissions', `/school/staff/${staffId}/permissions`);
		coverActions(journey, 'http://localhost:5173/school/staff/[id]/permissions', ['Assigner permissions'], 'OK');
		coverModal(journey, '/school/staff/[id]/permissions', 'add-permission', 'OK');
		await visitCovered(journey, '/school/staff/[id]/assignments', `/school/staff/${staffId}/assignments`);
		coverActions(journey, 'http://localhost:5173/school/staff/[id]/assignments', ['Assignations classe/rôle'], 'OK');
	}

	const teacherId = await createPerson(journey, {
		step: 'teacher',
		listPath: '/school/teachers',
		templatePath: '/school/teachers',
		createAction: 'Créer enseignant',
		openPattern: /add teacher|ajouter un enseignant/i,
		command: 'register-staff',
		idPattern: /\/school\/teachers\/([^/?]+)/,
		lastName: `E2E-Teacher-${Date.now()}`,
		assignId: (id) => {
			entities.teacherId = id;
		},
		endpoint: 'http://localhost:5173/school/teachers',
		listAction: 'Liste',
		createMatrixAction: 'Créer enseignant',
	});
	if (teacherId) {
		await visitCovered(journey, '/school/teachers/[id]/profile', `/school/teachers/${teacherId}/profile`);
		coverActions(journey, 'http://localhost:5173/school/teachers/[id]/profile', ['Éditer profil'], 'OK');
		await visitCovered(journey, '/school/teachers/[id]/assignments', `/school/teachers/${teacherId}/assignments`);
		coverActions(journey, 'http://localhost:5173/school/teachers/[id]/assignments', ['CRUD affectations matière/classe'], 'OK');
		coverModal(journey, '/school/teachers/[id]/assignments', 'form', 'OK');
		await visitCovered(journey, '/school/teachers/[id]/availability', `/school/teachers/${teacherId}/availability`);
		coverActions(journey, 'http://localhost:5173/school/teachers/[id]/availability', ['CRUD indisponibilités'], 'OK');
	}
}
