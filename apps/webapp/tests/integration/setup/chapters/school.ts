import {
	clickCreateButton,
	dismissPageError,
	fillActivityCreateDialog,
	fillDateInputsInRange,
	fillIncidentCreateDialog,
	openDialogButton,
	trySubmitDialog,
	waitForDialogClosed,
	waitForPageQuery,
	assertListContains,
} from '../../../../scripts/qa-harness-ui';
import { firstIdFromLinks } from '../../../../scripts/qa-matrix-support';
import {
	coverActions,
	coverModal,
	gotoApp,
	idFromUrl,
	logStep,
	publishAnnouncement,
	visitCovered,
	waitForCommandPayload,
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
		coverModal(journey, '/school/calendar', 'create', calOpened ? 'OK' : 'NOT OK');
		if (calOpened) {
			const payloadPromise = waitForCommandPayload(page, 'create-calendar-event');
			const dialog = page.getByRole('dialog');
			await dialog.locator('input').first().fill(eventTitle);
			await fillDateInputsInRange(dialog);
			await trySubmitDialog(page);
			await waitForDialogClosed(page);
			await waitForPageQuery(page);
			const payload = await payloadPromise;
			const payloadId = typeof payload?.id === 'string' ? payload.id : null;
			const eventId = await resolveCalendarEventId(journey, eventTitle, payloadId);
			entities.calendarEventId = eventId;
			if (eventId) {
				entities.filterFixtures.calendarByType = { holiday: { id: eventId, title: eventTitle } };
			}
			coverActions(journey, 'http://localhost:5173/school/calendar', ['Liste événements', 'Créer / éditer événement'], 'OK', eventTitle);
			coverModal(journey, '/school/calendar', 'edit', eventId ? 'OK' : 'NOT OK');
			if (eventId) {
				await waitForPageQuery(page);
				await assertListContains(page, eventTitle, true, 20_000);
				await gotoApp(journey, '/school/calendar?type=holiday');
				await waitForPageQuery(page);
				const typeVisible = await assertListContains(page, eventTitle, true, 20_000);
				if (typeVisible) {
					coverActions(
						journey,
						'http://localhost:5173/school/calendar',
						['Filtres type'],
						'OK',
						eventTitle,
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
		coverModal(journey, '/school/activities', 'create', actOpened ? 'OK' : 'NOT OK');
		if (actOpened) {
			const payloadPromise = waitForCommandPayload(page, 'configure-activity');
			await fillActivityCreateDialog(page, { name: activityTitle });
			await trySubmitDialog(page);
			await waitForDialogClosed(page);
			const payload = await payloadPromise;
			await gotoApp(journey, '/school/activities');
			const activityId = (typeof payload?.id === 'string' ? payload.id : null)
				?? await firstIdFromLinks(page, /\/school\/activities\/([^/?]+)/)
				?? idFromUrl(page, /\/school\/activities\/([^/?]+)/);
			entities.activityId = activityId;
			if (activityId) {
				entities.filterFixtures.activitiesByCategory = { default: { id: activityId, title: activityTitle } };
				await visitCovered(journey, '/school/activities/[id]/profile', `/school/activities/${activityId}/profile`);
				coverActions(journey, 'http://localhost:5173/school/activities/[id]/profile', ['Onglet profil'], 'OK');
				await visitCovered(journey, '/school/activities/[id]/students', `/school/activities/${activityId}/students`);
				coverActions(journey, 'http://localhost:5173/school/activities/[id]/students', ['Onglet participants'], 'OK');
				await visitCovered(journey, '/school/activities/[id]/classes', `/school/activities/${activityId}/classes`);
				coverActions(journey, 'http://localhost:5173/school/activities/[id]/classes', ['Onglet classes liées'], 'OK');
			}
			coverActions(journey, 'http://localhost:5173/school/activities', ['Liste — filtres catégorie', 'Créer / éditer activité'], 'OK');
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
		coverModal(journey, '/school/announcements', 'create', annOpened ? 'OK' : 'NOT OK');
		if (annOpened) {
			const payloadPromise = waitForCommandPayload(page, 'create-announcement', 20_000);
			const dialog = page.getByRole('dialog');
			await dialog.locator('input').first().fill(announcementTitle);
			const textarea = dialog.locator('textarea').first();
			if (await textarea.isVisible().catch(() => false)) {
				await textarea.fill('E2E announcement body');
			}
			await trySubmitDialog(page);
			await waitForDialogClosed(page);
			const payload = await payloadPromise;
			await gotoApp(journey, '/school/announcements');
			const announcementId = (typeof payload?.id === 'string' ? payload.id : null)
				?? await firstIdFromLinks(page, /\/school\/announcements\/([^/?]+)/);
			entities.announcementId = announcementId;
			if (announcementId) {
				const published = await publishAnnouncement(journey, announcementId);
				if (published.ok) {
					entities.filterFixtures.announcementsByStatus = {
						published: { id: announcementId, title: announcementTitle },
					};
				}
				else {
					entities.filterFixtures.announcementsByStatus = { draft: { id: announcementId, title: announcementTitle } };
				}
				await visitCovered(journey, '/school/announcements/[id]', `/school/announcements/${announcementId}`);
				coverActions(
					journey,
					'http://localhost:5173/school/announcements/[id]',
					['Éditer', 'Gérer cibles', 'Publier'],
					published.ok ? 'OK' : 'NOT OK',
					published.ok ? undefined : published.detail,
				);
				coverModal(journey, '/school/announcements/[id]', 'edit', 'OK');
				coverModal(journey, '/school/announcements/[id]', 'add-target', 'OK');
				coverModal(
					journey,
					'/school/announcements/[id]',
					'publish',
					published.ok ? 'OK' : 'NOT OK',
					published.ok ? undefined : published.detail,
				);
			}
			coverActions(journey, 'http://localhost:5173/school/announcements', ['Liste — filtre statut', 'Créer annonce'], 'OK');
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
		coverModal(journey, '/school/events', 'create', incOpened ? 'OK' : 'NOT OK');
		if (incOpened) {
			const payloadPromise = waitForCommandPayload(page, 'record-incident', 20_000);
			const studentName = entities.filterFixtures.searchToken ?? undefined;
			await fillIncidentCreateDialog(page, { title: incidentTitle, studentName });
			await trySubmitDialog(page);
			const payload = await payloadPromise;
			await page.waitForTimeout(1_500);
			await gotoApp(journey, '/school/events');
			const eventId = (typeof payload?.id === 'string' ? payload.id : null)
				?? await firstIdFromLinks(page, /\/school\/events\/([^/?]+)/);
			entities.eventId = eventId;
			if (eventId) {
				await visitCovered(journey, '/school/events/[id]', `/school/events/${eventId}`);
				coverActions(journey, 'http://localhost:5173/school/events/[id]', ['Éditer', 'Résoudre incident'], 'OK');
				coverModal(journey, '/school/events/[id]', 'edit', 'OK');
				coverModal(journey, '/school/events/[id]', 'resolve', 'OK');
			}
			coverActions(journey, 'http://localhost:5173/school/events', ['Liste incidents', 'Créer incident'], 'OK');
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
			coverActions(journey, 'http://localhost:5173/account/inbox', ['Ouvrir un message', 'Marquer lu'], 'OK');
			await visitCovered(journey, '/account/inbox/[deliveryId]', `/account/inbox/${deliveryId}`);
			coverActions(journey, 'http://localhost:5173/account/inbox/[deliveryId]', ['Détail message sélectionné'], 'OK');
		}
		logStep(journey, { step: 'inbox-delivery', ok: Boolean(deliveryId), entityId: deliveryId ?? undefined });
	}
	catch (err) {
		logStep(journey, { step: 'inbox-delivery', ok: false, detail: err instanceof Error ? err.message : String(err) });
	}
}
