import {
	clickCreateButton,
	dismissPageError,
	fillActivityCreateDialog,
	fillDateInputsInRange,
	fillIncidentCreateDialog,
	fillLabeledInput,
	openDialogButton,
	trySubmitDialog,
	waitForDialogClosed,
	waitForPageQuery,
	assertListContains,
} from '../../../../scripts/qa-harness-ui';
import { firstIdFromLinks } from '../../../../scripts/qa-matrix-support';
import {
	coverActions,
	coverCompletedModal,
	coverModal,
	coverMutationActions,
	gotoApp,
	idFromUrl,
	logStep,
	publishAnnouncement,
	runModalMutation,
	visitCovered,
	waitForCommandPayload,
	waitForCommandResult,
	type UiJourney,
} from '../journey-context';

async function resolveCalendarEventId(
	journey: UiJourney,
	eventTitle: string,
	payloadId: string | null,
): Promise<string | null> {
	const { page } = journey.ctx;
	if (payloadId) {
		return payloadId;
	}
	await gotoApp(journey, '/school/calendar');
	const fromUrl = idFromUrl(page, /modalTarget=([^&]+)/);
	if (fromUrl) {
		return fromUrl;
	}
	const row = page.locator('main').getByText(eventTitle, { exact: false }).first();
	if (!(await row.isVisible({ timeout: 8_000 }).catch(() => false))) {
		return firstIdFromLinks(page, /\/school\/calendar\/([^/?]+)/);
	}
	const editBtn = row.locator('xpath=ancestor::li[1]').getByRole('button', { name: /edit|modifier/i }).first()
		.or(row.locator('xpath=ancestor::article[1]').getByRole('button', { name: /edit|modifier/i }).first());
	if (await editBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
		await editBtn.click();
		await page.waitForTimeout(500);
		const match = page.url().match(/modalTarget=([^&]+)/);
		if (match?.[1]) {
			await page.keyboard.press('Escape').catch(() => {});
			return decodeURIComponent(match[1]);
		}
	}
	return firstIdFromLinks(page, /\/school\/calendar\/([^/?]+)/);
}

export async function runSchoolChapter(journey: UiJourney): Promise<void> {
	const { entities } = journey;
	const { page } = journey.ctx;
	console.log('\n--- Journey: school ---');

	try {
		const eventTitle = `E2E-Calendar-${Date.now()}`;
		await gotoApp(journey, '/school/calendar?modal=create');
		await visitCovered(journey, '/school/calendar', '/school/calendar');
		let calOpened = await page.getByRole('dialog').isVisible({ timeout: 5_000 }).catch(() => false);
		if (!calOpened) {
			calOpened = await openDialogButton(page, /add event|ajouter un évènement|ajouter un événement/i)
				|| await clickCreateButton(page, 'Créer / éditer événement', '/school/calendar');
		}
		if (!calOpened) {
			coverCompletedModal(journey, '/school/calendar', 'create', {
				opened: false,
				submitted: false,
				closed: false,
			}, 'Calendar create modal not found');
		}
		if (calOpened) {
			const resultPromise = waitForCommandResult(page, 'create-calendar-event');
			const dialog = page.getByRole('dialog');
			await dialog.locator('input').first().fill(eventTitle);
			await fillDateInputsInRange(dialog);
			await trySubmitDialog(page);
			const closed = await waitForDialogClosed(page);
			await waitForPageQuery(page);
			const result = await resultPromise;
			const responseId = typeof result?.id === 'string' ? result.id : null;
			const listed = await assertListContains(page, eventTitle, true, 20_000);
			const eventId = responseId ?? (listed ? await resolveCalendarEventId(journey, eventTitle, null) : null);
			entities.calendarEventId = eventId;
			if (eventId && listed) {
				entities.filterFixtures.calendarByType = { holiday: { id: eventId, title: eventTitle } };
			}
			const persisted = listed || responseId !== null;
			coverCompletedModal(journey, '/school/calendar', 'create', {
				opened: true,
				submitted: true,
				closed,
				postcondition: persisted,
			}, eventTitle);
			coverActions(journey, 'http://localhost:5173/school/calendar', ['Liste événements'], listed ? 'OK' : 'NOT OK', eventTitle);
			coverMutationActions(
				journey,
				'http://localhost:5173/school/calendar',
				['Créer / éditer événement'],
				{ exercised: true, postcondition: persisted },
				eventTitle,
			);
			if (eventId) {
				const editedTitle = `${eventTitle}-QA`;
				await runModalMutation(journey, {
					parentRoute: '/school/calendar',
					modal: 'edit',
					pathname: '/school/calendar',
					target: eventId,
					command: 'calendar-events',
					fill: async (current) => {
						await current.getByRole('dialog').locator('input').first().fill(editedTitle);
					},
					visibleAfter: editedTitle,
					listPath: '/school/calendar',
				});
				await waitForPageQuery(page);
				await assertListContains(page, editedTitle, true, 20_000);
				await gotoApp(journey, '/school/calendar?type=holiday');
				await waitForPageQuery(page);
				const typeVisible = await assertListContains(page, editedTitle, true, 20_000)
					|| await assertListContains(page, eventTitle, true, 8_000);
				if (typeVisible) {
					coverActions(
						journey,
						'http://localhost:5173/school/calendar',
						['Filtres type'],
						'OK',
						editedTitle,
					);
				}
			}
			logStep(journey, { step: 'calendar-event', ok: Boolean(eventId), detail: eventTitle, entityId: eventId ?? undefined });
		}
		else {
			logStep(journey, { step: 'calendar-event', ok: false, detail: 'Calendar create modal not found' });
		}
	}
	catch (err) {
		logStep(journey, { step: 'calendar-event', ok: false, detail: err instanceof Error ? err.message : String(err) });
		await page.keyboard.press('Escape').catch(() => {});
	}

	try {
		const activityTitle = `E2E-Activity-${Date.now()}`;
		await visitCovered(journey, '/school/activities', '/school/activities');
		const actOpened = await openDialogButton(page, /add activity|ajouter une activité/i);
		if (!actOpened) {
			coverCompletedModal(journey, '/school/activities', 'create', {
				opened: false,
				submitted: false,
				closed: false,
			}, 'Activity modal not found');
		}
		if (actOpened) {
			const resultPromise = waitForCommandResult(page, 'configure-activity');
			await fillActivityCreateDialog(page, { name: activityTitle });
			await trySubmitDialog(page);
			const closed = await waitForDialogClosed(page);
			const result = await resultPromise;
			const responseId = typeof result?.id === 'string' ? result.id : null;
			await gotoApp(journey, '/school/activities');
			const listed = await assertListContains(page, activityTitle, true, 20_000);
			const activityId = responseId ?? (listed
				? await firstIdFromLinks(page, /\/school\/activities\/([^/?]+)/)
				: null);
			const persisted = listed || responseId !== null;
			entities.activityId = activityId;
			coverCompletedModal(journey, '/school/activities', 'create', {
				opened: true,
				submitted: true,
				closed,
				postcondition: persisted,
			}, activityTitle);
			if (activityId) {
				entities.filterFixtures.activitiesByCategory = { default: { id: activityId, title: activityTitle } };
				await visitCovered(journey, '/school/activities/[id]/profile', `/school/activities/${activityId}/profile`);
				coverActions(journey, 'http://localhost:5173/school/activities/[id]/profile', ['Onglet profil'], 'OK');
				await visitCovered(journey, '/school/activities/[id]/students', `/school/activities/${activityId}/students`);
				coverActions(journey, 'http://localhost:5173/school/activities/[id]/students', ['Onglet participants'], 'OK');
				await visitCovered(journey, '/school/activities/[id]/classes', `/school/activities/${activityId}/classes`);
				coverActions(journey, 'http://localhost:5173/school/activities/[id]/classes', ['Onglet classes liées'], 'OK');
			}
			coverActions(journey, 'http://localhost:5173/school/activities', ['Liste — filtres catégorie'], listed ? 'OK' : 'NOT OK', activityTitle);
			coverMutationActions(
				journey,
				'http://localhost:5173/school/activities',
				['Créer / éditer activité'],
				{ exercised: true, postcondition: persisted },
				activityTitle,
			);
			logStep(journey, { step: 'activity', ok: Boolean(activityId), detail: activityTitle, entityId: activityId ?? undefined });
		}
		else {
			logStep(journey, { step: 'activity', ok: false, detail: 'Activity modal not found' });
		}
	}
	catch (err) {
		logStep(journey, { step: 'activity', ok: false, detail: err instanceof Error ? err.message : String(err) });
		await page.keyboard.press('Escape').catch(() => {});
	}

	try {
		const announcementTitle = `E2E-Announcement-${Date.now()}`;
		await gotoApp(journey, '/school/announcements?modal=create');
		await visitCovered(journey, '/school/announcements', '/school/announcements');
		let annOpened = await page.getByRole('dialog').isVisible({ timeout: 5_000 }).catch(() => false);
		if (!annOpened) {
			annOpened = await openDialogButton(page, /add announcement|ajouter une annonce/i)
				|| await clickCreateButton(page, 'Créer annonce', '/school/announcements');
		}
		if (!annOpened) {
			coverCompletedModal(journey, '/school/announcements', 'create', {
				opened: false,
				submitted: false,
				closed: false,
			}, 'Announcement modal not found');
		}
		if (annOpened) {
			const resultPromise = waitForCommandResult(page, 'create-announcement', 20_000);
			const dialog = page.getByRole('dialog');
			await dialog.locator('input').first().fill(announcementTitle);
			const textarea = dialog.locator('textarea').first();
			if (await textarea.isVisible().catch(() => false)) {
				await textarea.fill('E2E announcement body');
			}
			await trySubmitDialog(page);
			const closed = await waitForDialogClosed(page);
			const result = await resultPromise;
			const responseId = typeof result?.id === 'string' ? result.id : null;
			await gotoApp(journey, '/school/announcements');
			const listed = await assertListContains(page, announcementTitle, true, 20_000);
			const announcementId = responseId ?? (listed
				? await firstIdFromLinks(page, /\/school\/announcements\/([^/?]+)/)
				: null);
			const persisted = listed || responseId !== null;
			entities.announcementId = announcementId;
			coverCompletedModal(journey, '/school/announcements', 'create', {
				opened: true,
				submitted: true,
				closed,
				postcondition: persisted,
			}, announcementTitle);
			if (announcementId) {
				const editedAnnouncement = `${announcementTitle}-QA`;
				await visitCovered(journey, '/school/announcements/[id]', `/school/announcements/${announcementId}`);
				await runModalMutation(journey, {
					parentRoute: '/school/announcements/[id]',
					modal: 'edit',
					pathname: `/school/announcements/${announcementId}`,
					command: 'announcements',
					openLabel: /modifier|edit announcement|^edit$/i,
					fill: async (current) => {
						await current.getByRole('dialog').locator('input').first().fill(editedAnnouncement);
					},
					visibleAfter: editedAnnouncement,
					listPath: `/school/announcements/${announcementId}`,
					actionPath: 'http://localhost:5173/school/announcements/[id]',
					actions: ['Éditer'],
				});
				const published = await publishAnnouncement(journey, announcementId);
				if (published.ok) {
					entities.filterFixtures.announcementsByStatus = {
						published: { id: announcementId, title: editedAnnouncement },
					};
				}
				else {
					entities.filterFixtures.announcementsByStatus = { draft: { id: announcementId, title: editedAnnouncement } };
				}
				await visitCovered(journey, '/school/announcements/[id]', `/school/announcements/${announcementId}`);
				coverMutationActions(
					journey,
					'http://localhost:5173/school/announcements/[id]',
					['Gérer cibles'],
					{ exercised: true, postcondition: published.ok || published.removeTargetVisible },
					published.ok ? undefined : published.detail,
				);
				coverCompletedModal(journey, '/school/announcements/[id]', 'add-target', {
					opened: published.ok || published.removeTargetVisible,
					submitted: published.ok || published.removeTargetVisible,
					closed: true,
					postcondition: published.ok || published.removeTargetVisible,
				}, published.detail);
				coverActions(
					journey,
					'http://localhost:5173/school/announcements/[id]',
					['Publier'],
					published.ok ? 'OK' : 'NOT OK',
					published.ok ? undefined : published.detail,
				);
				coverActions(
					journey,
					'http://localhost:5173/school/announcements/[id]',
					['Retirer destinataire'],
					published.removeTargetVisible ? 'OK' : 'NOT OK',
					published.removeTargetVisible ? undefined : 'remove-target control not visible on draft',
				);
				coverModal(
					journey,
					'/school/announcements/[id]',
					'publish',
					published.ok ? 'OK' : 'NOT OK',
					published.ok ? undefined : published.detail,
				);
			}
			coverActions(journey, 'http://localhost:5173/school/announcements', ['Liste — filtre statut'], listed ? 'OK' : 'NOT OK', announcementTitle);
			coverMutationActions(
				journey,
				'http://localhost:5173/school/announcements',
				['Créer annonce'],
				{ exercised: true, postcondition: persisted },
				announcementTitle,
			);
			logStep(journey, { step: 'announcement', ok: Boolean(announcementId), detail: announcementTitle, entityId: announcementId ?? undefined });
		}
		else {
			logStep(journey, { step: 'announcement', ok: false, detail: 'Announcement modal not found' });
		}
	}
	catch (err) {
		logStep(journey, { step: 'announcement', ok: false, detail: err instanceof Error ? err.message : String(err) });
		await page.keyboard.press('Escape').catch(() => {});
	}

	try {
		const incidentTitle = `E2E-Incident-${Date.now()}`;
		await visitCovered(journey, '/school/events', '/school/events');
		await waitForPageQuery(page);
		const incOpened = await openDialogButton(page, /add incident|ajouter un incident/i);
		if (!incOpened) {
			coverCompletedModal(journey, '/school/events', 'create', {
				opened: false,
				submitted: false,
				closed: false,
			}, 'Incident modal not found');
		}
		if (incOpened) {
			const payloadPromise = waitForCommandPayload(page, 'record-incident', 20_000);
			const resultPromise = waitForCommandResult(page, 'record-incident', 20_000);
			const involvementPromise = waitForCommandResult(page, 'add-student-involvement', 8_000);
			const studentName = entities.filterFixtures.searchToken ?? undefined;
			await fillIncidentCreateDialog(page, { title: incidentTitle, studentName });
			await trySubmitDialog(page);
			const closed = await waitForDialogClosed(page);
			const payload = await payloadPromise;
			const result = await resultPromise;
			await involvementPromise;
			const responseId = typeof payload?.id === 'string'
				? payload.id
				: typeof result?.id === 'string' ? result.id : null;
			await gotoApp(journey, '/school/events');
			const listed = await assertListContains(page, incidentTitle, true, 20_000);
			const eventId = responseId ?? (listed
				? await firstIdFromLinks(page, /\/school\/events\/([^/?]+)/)
				: null);
			const persisted = listed || responseId !== null;
			entities.eventId = eventId;
			coverCompletedModal(journey, '/school/events', 'create', {
				opened: true,
				submitted: true,
				closed,
				postcondition: persisted,
			}, incidentTitle);
			if (eventId) {
				await visitCovered(journey, '/school/events/[id]', `/school/events/${eventId}`);
				const editedIncident = `${incidentTitle}-QA`;
				await runModalMutation(journey, {
					parentRoute: '/school/events/[id]',
					modal: 'edit',
					pathname: `/school/events/${eventId}`,
					command: 'incidents',
					openLabel: /modifier|edit incident|^edit$/i,
					fill: async (current) => {
						await fillLabeledInput(current, /title|titre/i, editedIncident);
					},
					visibleAfter: editedIncident,
					listPath: `/school/events/${eventId}`,
					actionPath: 'http://localhost:5173/school/events/[id]',
					actions: ['Éditer'],
				});
				const resolved = await runModalMutation(journey, {
					parentRoute: '/school/events/[id]',
					modal: 'resolve',
					pathname: `/school/events/${eventId}`,
					command: 'resolve-incident-with-outcomes',
					openLabel: /résoudre|resolve/i,
					fill: async (current) => {
						const notes = current.getByRole('dialog').locator('textarea').first();
						if (await notes.isVisible({ timeout: 8_000 }).catch(() => false)) {
							await notes.fill('QA resolved');
						}
					},
					listPath: `/school/events/${eventId}`,
				});
				coverMutationActions(
					journey,
					'http://localhost:5173/school/events/[id]',
					['Résoudre incident'],
					{ exercised: resolved.opened, postcondition: resolved.postcondition },
					resolved.postcondition ? editedIncident : 'resolve not confirmed',
				);
			}
			coverActions(journey, 'http://localhost:5173/school/events', ['Liste incidents'], listed ? 'OK' : 'NOT OK', incidentTitle);
			coverMutationActions(
				journey,
				'http://localhost:5173/school/events',
				['Créer incident'],
				{ exercised: true, postcondition: persisted },
				incidentTitle,
			);
			logStep(journey, { step: 'incident', ok: Boolean(eventId), detail: incidentTitle, entityId: eventId ?? undefined });
		}
		else {
			logStep(journey, { step: 'incident', ok: false, detail: 'Incident modal not found' });
		}
	}
	catch (err) {
		logStep(journey, { step: 'incident', ok: false, detail: err instanceof Error ? err.message : String(err) });
		await page.keyboard.press('Escape').catch(() => {});
	}

	try {
		await gotoApp(journey, '/account/inbox');
		await dismissPageError(page);
		await waitForPageQuery(page);
		const deliveryId = await firstIdFromLinks(page, /\/account\/inbox\/([^/]+)/)
			?? (await (async () => {
				const row = page.locator('main button, main a[href*="/account/inbox/"]').first();
				if (!(await row.isVisible({ timeout: 8_000 }).catch(() => false))) {
					return null;
				}
				await row.click();
				await page.waitForTimeout(800);
				return idFromUrl(page, /\/account\/inbox\/([^/]+)/);
			})());
		entities.deliveryId = deliveryId;
		if (deliveryId) {
			coverActions(journey, 'http://localhost:5173/account/inbox', ['Ouvrir un message'], 'OK');
			const readLabel = page.getByText(/^(lu|read)$/i).first();
			const markedRead = await readLabel.isVisible({ timeout: 10_000 }).catch(() => false)
				|| await page.getByText(/\blu\b|\bread\b/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
			coverMutationActions(
				journey,
				'http://localhost:5173/account/inbox',
				['Marquer lu'],
				{ exercised: true, postcondition: markedRead },
				markedRead ? undefined : 'opened message read state not visible',
			);
			await visitCovered(journey, '/account/inbox/[deliveryId]', `/account/inbox/${deliveryId}`);
			coverActions(journey, 'http://localhost:5173/account/inbox/[deliveryId]', ['Détail message sélectionné'], 'OK');
		}
		logStep(journey, { step: 'inbox-delivery', ok: Boolean(deliveryId), entityId: deliveryId ?? undefined });
	}
	catch (err) {
		logStep(journey, { step: 'inbox-delivery', ok: false, detail: err instanceof Error ? err.message : String(err) });
	}
}
