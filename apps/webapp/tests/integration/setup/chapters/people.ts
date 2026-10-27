import { chooseOption, selectOptions } from '../../support/custom-select';
import {
	assertListContains,
	confirmDialog,
	fillIncidentTitle,
	fillLabeledInput,
	fillPersonCreateDialog,
	fillStudentCreateDialog,
	listSearchInput,
	openDialogButton,
	openUrlModal,
	refreshAppShell,
	searchAndSelectPerson,
	waitForDialogClosed,
	waitForPageQuery,
	waitForSubmitEnabled,
} from '../../../../scripts/qa-harness-ui';
import { setStudentStatus } from '../filter-setup';
import {
	clickFirstRow,
	coverActions,
	coverCompletedModal,
	coverMutationActions,
	gotoApp,
	idFromUrl,
	logStep,
	runModalMutation,
	visitCovered,
	waitForCommandResult,
	type UiJourney,
} from '../journey-context';

const STUDENT_TABS = ['profile', 'grades', 'attendance', 'incidents', 'finances', 'report-card', 'enrollments', 'documents'] as const;
const STUDENT_CREATE_BUTTON = /add student|ajouter un élève/i;

async function openStudentCreateModal(journey: UiJourney): Promise<boolean> {
	const { page, base } = journey.ctx;
	const heading = page.getByRole('heading', { name: /effectif|roster|élèves|students/i }).first();
	await heading.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

	if (await openDialogButton(page, STUDENT_CREATE_BUTTON, 15_000)) {
		return true;
	}
	if (await openUrlModal(page, '/school/students', 'create', { base })) {
		return true;
	}
	await refreshAppShell(page, base);
	await gotoApp(journey, '/school/students');
	await heading.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
	if (await openDialogButton(page, STUDENT_CREATE_BUTTON, 10_000)) {
		return true;
	}
	return openUrlModal(page, '/school/students', 'create', { base });
}

async function createExtraStudent(journey: UiJourney, lastName: string): Promise<string | null> {
	const { page } = journey.ctx;
	await gotoApp(journey, '/school/students');
	const opened = await openStudentCreateModal(journey);
	if (!opened) {
		return null;
	}
	const resultPromise = waitForCommandResult(page, 'register-student');
	await fillStudentCreateDialog(page, { firstName: 'E2E', lastName, className: /E2E-6A-/ });
	if (!(await waitForDialogClosed(page))) {
		return null;
	}
	const result = await resultPromise;
	return typeof result?.id === 'string' ? result.id : null;
}

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
	if (!opened) {
		coverCompletedModal(journey, opts.templatePath, 'create', {
			opened: false,
			submitted: false,
			closed: false,
		}, 'Create modal not found');
		coverActions(journey, opts.endpoint, [opts.createMatrixAction], 'NOT OK', 'Create modal not found');
		logStep(journey, { step: opts.step, ok: false, detail: 'Create modal not found' });
		return null;
	}
	const resultPromise = waitForCommandResult(page, opts.command);
	await fillPersonCreateDialog(page, { firstName: 'E2E', lastName: opts.lastName });
	const closed = await waitForDialogClosed(page);
	const result = await resultPromise;
	const responseId = typeof result?.id === 'string' ? result.id : null;
	await gotoApp(journey, opts.listPath);
	await waitForPageQuery(page);
	const listed = await assertListContains(page, opts.lastName, true, 20_000);
	const id = responseId ?? (listed ? await idFromNamedRow(page, opts.lastName, opts.idPattern) : null);
	if (id) {
		opts.assignId(id);
	}
	const persisted = listed || responseId !== null;
	coverCompletedModal(journey, opts.templatePath, 'create', {
		opened: true,
		submitted: true,
		closed,
		postcondition: persisted,
	}, opts.lastName);
	coverMutationActions(
		journey,
		opts.endpoint,
		[opts.createMatrixAction],
		{ exercised: true, postcondition: persisted },
		opts.lastName,
	);
	if (listed) {
		coverActions(journey, opts.endpoint, [opts.listAction], 'OK', opts.lastName);
	}
	logStep(journey, { step: opts.step, ok: persisted, detail: opts.lastName, entityId: id ?? undefined });
	return id;
}

async function idFromNamedRow(page: UiJourney['ctx']['page'], name: string, idPattern: RegExp): Promise<string | null> {
	const row = page.locator('main li, main tr').filter({ hasText: name }).first();
	if (!(await row.isVisible({ timeout: 2_000 }).catch(() => false))) {
		return null;
	}
	const href = await row.locator('a[href]').first().getAttribute('href').catch(() => null);
	const fromHref = href?.match(idPattern)?.[1];
	if (fromHref) {
		return fromHref;
	}
	await row.click().catch(() => {});
	return idFromUrl(page, idPattern);
}

export async function runPeopleChapter(journey: UiJourney): Promise<void> {
	const { ctx, entities } = journey;
	const { page } = ctx;
	console.log('\n--- Journey: people ---');

	await visitCovered(journey, '/school/students', '/school/students');
	const lastName = `E2E-Student-${Date.now()}`;
	const opened = await openStudentCreateModal(journey);
	if (!opened) {
		coverCompletedModal(journey, '/school/students', 'create', {
			opened: false,
			submitted: false,
			closed: false,
		}, 'Create student modal not found');
		coverActions(journey, 'http://localhost:5173/school/students', ['Créer élève (modal)'], 'NOT OK', 'Create student modal not found');
		logStep(journey, { step: 'student', ok: false, detail: 'Create student modal not found' });
	}
	else {
		const resultPromise = waitForCommandResult(page, 'register-student');
		await fillStudentCreateDialog(page, { firstName: 'E2E', lastName, className: /E2E-6A-/ });
		const closed = await waitForDialogClosed(page);
		const result = await resultPromise;
		const responseId = typeof result?.id === 'string' ? result.id : null;
		await gotoApp(journey, '/school/students');
		await waitForPageQuery(page);
		const listed = await assertListContains(page, lastName, true, 20_000);
		let studentId = responseId;
		if (!studentId && listed) {
			const search = listSearchInput(page);
			if (await search.isVisible().catch(() => false)) {
				await search.fill(lastName);
				await page.waitForTimeout(800);
			}
			studentId = await idFromNamedRow(page, lastName, /\/school\/students\/([^/?]+)/);
			if (!studentId && await clickFirstRow(page)) {
				const openedId = idFromUrl(page, /\/school\/students\/([^/?]+)/);
				const nameNode = page.getByText(lastName, { exact: false }).first();
				const showsName = await nameNode.isVisible({ timeout: 4_000 }).catch(() => false);
				studentId = showsName ? openedId : null;
			}
		}
		const persisted = listed || responseId !== null;
		entities.studentId = studentId;
		entities.classStudentId = studentId;
		entities.createdStudentId = studentId ?? 'created';
		if (studentId) {
			entities.filterFixtures.searchToken = lastName;
		}
		if (studentId && entities.classId) {
			await gotoApp(journey, `/school/students?class=${entities.classId}`);
			const classVisible = await assertListContains(page, lastName, true, 20_000);
			entities.filterFixtures.studentsByClass = {
				[entities.classId]: { id: studentId, lastName, classId: entities.classId },
			};
			entities.filterFixtures.studentsByStatus = {
				active: { id: studentId, lastName },
			};
			if (classVisible) {
				coverActions(
					journey,
					'http://localhost:5173/school/students',
					['Filtre classe'],
					'OK',
					lastName,
				);
			}
		}
		coverCompletedModal(journey, '/school/students', 'create', {
			opened: true,
			submitted: true,
			closed,
			postcondition: persisted,
		}, lastName);
		coverMutationActions(
			journey,
			'http://localhost:5173/school/students',
			['Créer élève (modal)'],
			{ exercised: true, postcondition: persisted },
			lastName,
		);
		if (listed) {
			coverActions(
				journey,
				'http://localhost:5173/school/students',
				studentId ? ['Liste — affichage', 'Recherche'] : ['Liste — affichage'],
				'OK',
				lastName,
			);
		}
		logStep(journey, { step: 'student', ok: persisted, detail: lastName, entityId: studentId ?? undefined });

		if (studentId) {
			const failedTabs = new Set<string>();
			try {
				for (const tab of STUDENT_TABS) {
					const path = `/school/students/${studentId}/${tab}`;
					const failed = await visitCovered(journey, `/school/students/[id]/${tab}`, path);
					if (failed) {
						failedTabs.add(tab);
					}
				}
			}
			catch (err) {
				console.error(
					'Student tab walk failed; continuing people setup:',
					err instanceof Error ? err.message : err,
				);
			}

			const tabAction = (tab: (typeof STUDENT_TABS)[number], endpoint: string, actions: readonly string[]) => {
				coverActions(
					journey,
					endpoint,
					actions,
					failedTabs.has(tab) ? 'NOT OK' : 'OK',
				);
			};
			tabAction('profile', 'http://localhost:5173/school/students/[id]/profile', ['Ouvrir drawer profil']);
			tabAction('grades', 'http://localhost:5173/school/students/[id]/grades', ['Consulter notes']);
			tabAction('finances', 'http://localhost:5173/school/students/[id]/finances', ['Consulter lignes finance']);
			tabAction('enrollments', 'http://localhost:5173/school/students/[id]/enrollments', ['Historique inscriptions']);

			try {
				const noteBody = `QA note ${Date.now()}`;
				await runModalMutation(journey, {
					parentRoute: '/school/students/[id]/profile',
					modal: 'note',
					pathname: `/school/students/${studentId}/profile`,
					command: 'create-student-note',
					openLabel: /ajouter une note|add a note|add note/i,
					fill: async (current) => {
						const textarea = current.getByRole('dialog').locator('textarea').first();
						await textarea.fill(noteBody);
					},
					visibleAfter: noteBody,
					listPath: `/school/students/${studentId}/profile`,
					actionPath: 'http://localhost:5173/school/students/[id]/profile',
					actions: ['Notes pédagogiques — créer / éditer'],
				});

				const editedStudentName = `${lastName}-QA`;
				const studentEdit = await runModalMutation(journey, {
					parentRoute: '/school/students/[id]/profile',
					modal: 'edit-profile',
					pathname: `/school/students/${studentId}/profile`,
					command: 'update-student-profile',
					fill: async (current) => {
						if (!await fillLabeledInput(current, /^nom$|^last name$/i, editedStudentName)) {
							await current.getByRole('dialog').locator('input:not([type="date"]):not([type="email"])').nth(1).fill(editedStudentName);
						}
					},
					visibleAfter: editedStudentName,
					listPath: `/school/students/${studentId}/profile`,
					actionPath: 'http://localhost:5173/school/students/[id]/profile',
					actions: ['Éditer profil'],
				});
				if (studentEdit.postcondition) {
					entities.filterFixtures.searchToken = editedStudentName;
					if (entities.filterFixtures.studentsByStatus?.active) {
						entities.filterFixtures.studentsByStatus.active.lastName = editedStudentName;
					}
					if (entities.classId && entities.filterFixtures.studentsByClass?.[entities.classId]) {
						entities.filterFixtures.studentsByClass[entities.classId].lastName = editedStudentName;
					}
				}

				await runModalMutation(journey, {
					parentRoute: '/school/students/[id]/attendance',
					modal: 'add-absence',
					pathname: `/school/students/${studentId}/attendance`,
					command: 'record-daily-attendance',
					actionPath: 'http://localhost:5173/school/students/[id]/attendance',
					actions: ['Consulter / enregistrer absence'],
				});

				const studentIncidentTitle = `E2E-Student-Incident-${Date.now()}`;
				await runModalMutation(journey, {
					parentRoute: '/school/students/[id]/incidents',
					modal: 'add-incident',
					pathname: `/school/students/${studentId}/incidents`,
					command: 'record-incident',
					openLabel: /ajouter un incident|add incident|consigner un incident/i,
					fill: async (current) => {
						await fillIncidentTitle(current, studentIncidentTitle);
						const textarea = current.getByRole('dialog').locator('textarea').first();
						await textarea.fill('QA student incident');
					},
					visibleAfter: studentIncidentTitle,
					listPath: `/school/students/${studentId}/incidents`,
					actionPath: 'http://localhost:5173/school/students/[id]/incidents',
					actions: ['Consulter / créer incident'],
				});
			}
			catch (err) {
				console.error(
					'Student note/profile follow-up failed; continuing people setup:',
					err instanceof Error ? err.message : err,
				);
			}
		}
	}

	if (entities.studentId) {
		for (const status of ['inactive', 'archived'] as const) {
			const extraName = `E2E-${status}-${Date.now()}`;
			const extraId = await createExtraStudent(journey, extraName);
			if (!extraId) {
				logStep(journey, { step: `student-${status}`, ok: false, detail: 'create failed' });
				continue;
			}
			const updated = await setStudentStatus(ctx, extraId, status);
			if (updated) {
				entities.filterFixtures.studentsByStatus = {
					...entities.filterFixtures.studentsByStatus,
					[status]: { id: extraId, lastName: extraName },
				};
			}
			logStep(journey, {
				step: `student-${status}`,
				ok: updated,
				detail: extraName,
				entityId: extraId,
			});
		}
		const byStatus = entities.filterFixtures.studentsByStatus;
		if (byStatus?.active && byStatus.inactive && byStatus.archived) {
			let statusOk = true;
			for (const status of ['active', 'inactive', 'archived'] as const) {
				const fixture = byStatus[status];
				if (!fixture) {
					statusOk = false;
					break;
				}
				const classQuery = entities.classId ? `&class=${entities.classId}` : '';
				await gotoApp(journey, `/school/students?status=${status}${classQuery}`);
				if (!(await assertListContains(page, fixture.lastName, true, 20_000))) {
					statusOk = false;
					break;
				}
			}
			if (statusOk) {
				coverActions(
					journey,
					'http://localhost:5173/school/students',
					['Filtre statut (actif / inactif / archivé)'],
					'OK',
				);
			}
		}
	}

	const guardianLastName = `E2E-Guardian-${Date.now()}`;
	const guardianId = await createPerson(journey, {
		step: 'guardian',
		listPath: '/school/guardians',
		templatePath: '/school/guardians',
		createAction: 'Créer tuteur',
		openPattern: /add guardian|ajouter un tuteur/i,
		command: 'register-guardian',
		idPattern: /\/school\/guardians\/([^/?]+)/,
		lastName: guardianLastName,
		assignId: (id) => {
			entities.guardianId = id;
		},
		endpoint: 'http://localhost:5173/school/guardians',
		listAction: 'Liste — affichage / recherche',
		createMatrixAction: 'Créer tuteur',
	});
	if (guardianId) {
		await visitCovered(journey, '/school/guardians/[id]', `/school/guardians/${guardianId}`);
		coverActions(journey, 'http://localhost:5173/school/guardians/[id]', ['Élèves liés'], 'OK');
		const editedGuardian = `${guardianLastName}-QA`;
		await runModalMutation(journey, {
			parentRoute: '/school/guardians/[id]',
			modal: 'edit-profile',
			pathname: `/school/guardians/${guardianId}`,
			command: 'update-guardian-contact-methods',
			fill: async (current) => {
				await fillLabeledInput(current, /^nom$|^last name$/i, editedGuardian);
			},
			visibleAfter: editedGuardian,
			listPath: `/school/guardians/${guardianId}`,
			actionPath: 'http://localhost:5173/school/guardians/[id]',
			actions: ['Drawer — éditer'],
		});
		if (entities.studentId) {
			const linkOpened = await openUrlModal(
				page,
				`/school/students/${entities.studentId}/profile`,
				'link-guardian',
				{ base: ctx.base },
			) || await openDialogButton(page, /rattacher|tuteur|guardian|lier|link/i);
			let linkClosed = false;
			let linked = false;
			let submitted = false;
			if (linkOpened) {
				const resultPromise = waitForCommandResult(page, 'link-guardian-to-student');
				if (!await searchAndSelectPerson(page, editedGuardian)) {
					await searchAndSelectPerson(page, guardianLastName);
				}
				submitted = await confirmDialog(page, /rattacher|link|attach/i);
				linkClosed = submitted ? await waitForDialogClosed(page).catch(() => false) : false;
				const result = submitted ? await resultPromise : null;
				await gotoApp(journey, `/school/students/${entities.studentId}/profile`);
				const visible = await assertListContains(page, editedGuardian, true, 8_000)
					|| await assertListContains(page, guardianLastName, true, 4_000);
				linked = visible || result !== null;
			}
			coverCompletedModal(journey, '/school/students/[id]/profile', 'link-guardian', {
				opened: linkOpened,
				submitted,
				closed: linkClosed,
				postcondition: linked,
			}, editedGuardian);
		}
	}

	const staffId = await createPerson(journey, {
		step: 'staff',
		listPath: '/school/staff',
		templatePath: '/school/staff',
		createAction: 'Créer personnel',
		openPattern: /add staff member|ajouter un membre/i,
		command: 'register-staff-member',
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
		const staffLastName = `E2E-Staff-QA-${Date.now()}`;
		await runModalMutation(journey, {
			parentRoute: '/school/staff/[id]/profile',
			modal: 'edit-profile',
			pathname: `/school/staff/${staffId}/profile`,
			command: 'update-staff-member-profile',
			fill: async (current) => {
				await fillLabeledInput(current, /^nom$|^last name$/i, staffLastName);
			},
			visibleAfter: staffLastName,
			listPath: `/school/staff/${staffId}/profile`,
			actionPath: 'http://localhost:5173/school/staff/[id]/profile',
			actions: ['Éditer profil'],
		});
		await visitCovered(journey, '/school/staff/[id]/permissions', `/school/staff/${staffId}/permissions`);
		await runModalMutation(journey, {
			parentRoute: '/school/staff/[id]/permissions',
			modal: 'add-permission',
			pathname: `/school/staff/${staffId}/permissions`,
			command: 'assign-staff-permission',
			fill: async (current) => {
				const select = current.locator('#permission-select');
				await select.waitFor({ state: 'visible', timeout: 12_000 });
				const values = await selectOptions(select).evaluateAll((nodes) => (
					nodes
						.map(node => (node as HTMLOptionElement).value)
						.filter(entry => entry.length > 0)
				));
				for (const value of values) {
					await chooseOption(select, value);
					if (await waitForSubmitEnabled(current, 2_000)) {
						await current.getByTestId('form-modal-submit').click();
						await current.getByTestId('form-modal-submit').getByText(/save|enregistrer/i).waitFor();
						return;
					}
				}
			},
			listPath: `/school/staff/${staffId}/permissions`,
			actionPath: 'http://localhost:5173/school/staff/[id]/permissions',
			actions: ['Assigner permissions'],
		});
	}

	const teacherId = await createPerson(journey, {
		step: 'teacher',
		listPath: '/school/teachers',
		templatePath: '/school/teachers',
		createAction: 'Créer enseignant',
		openPattern: /add teacher|ajouter un enseignant/i,
		command: 'register-teacher',
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
		const teacherLastName = `E2E-Teacher-QA-${Date.now()}`;
		await runModalMutation(journey, {
			parentRoute: '/school/teachers/[id]/profile',
			modal: 'edit-profile',
			pathname: `/school/teachers/${teacherId}/profile`,
			command: 'teachers',
			openLabel: /modifier le profil|edit profile/i,
			fill: async (current) => {
				await fillLabeledInput(current, /^nom$|^last name$/i, teacherLastName);
			},
			visibleAfter: teacherLastName,
			listPath: `/school/teachers/${teacherId}/profile`,
			actionPath: 'http://localhost:5173/school/teachers/[id]/profile',
			actions: ['Éditer profil'],
		});
		await visitCovered(journey, '/school/teachers/[id]/assignments', `/school/teachers/${teacherId}/assignments`);
		await visitCovered(journey, '/school/teachers/[id]/availability', `/school/teachers/${teacherId}/availability`);
		await runModalMutation(journey, {
			parentRoute: '/school/teachers/[id]/availability',
			modal: 'add-unavailability',
			pathname: `/school/teachers/${teacherId}/availability`,
			command: 'teacherUnavailabilities',
			openLabel: /ajouter une indisponibilité|add unavailability/i,
			fill: async (current) => {
				await fillLabeledInput(current, /reason|motif|raison/i, 'QA unavailability');
			},
			visibleAfter: 'QA unavailability',
			listPath: `/school/teachers/${teacherId}/availability`,
			actionPath: 'http://localhost:5173/school/teachers/[id]/availability',
			actions: ['CRUD indisponibilités'],
		});
		await visitCovered(journey, '/school/teachers/[id]/timetable', `/school/teachers/${teacherId}/timetable`);
		await visitCovered(journey, '/school/teachers/[id]/evaluations', `/school/teachers/${teacherId}/evaluations`);
		await visitCovered(journey, '/school/teachers/[id]/family-feedback', `/school/teachers/${teacherId}/family-feedback`);
		await visitCovered(journey, '/school/teachers/[id]/documents', `/school/teachers/${teacherId}/documents`);
	}
}
