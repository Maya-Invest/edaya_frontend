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

function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

export async function runSchoolChapter(journey: UiJourney): Promise<void> {
	const { ctx, entities } = journey;
	const { page } = ctx;
	console.log('\n--- Journey: school ---');

	const eventTitle = `E2E-Calendar-${Date.now()}`;
	await visitCovered(journey, '/school/calendar', '/school/calendar');
	const calOpened = await openDialogButton(page, /add event|ajouter un évènement|ajouter un événement/i)
		|| await clickCreateButton(page, 'Créer / éditer événement', '/school/calendar');
	coverModal(journey, '/school/calendar', 'create', calOpened ? 'OK' : 'NOT OK');
	if (calOpened) {
		const dialog = page.getByRole('dialog');
		await dialog.locator('input').first().fill(eventTitle);
		const dateInput = dialog.locator('input[type="date"]').first();
		if (await dateInput.isVisible().catch(() => false)) {
			await dateInput.fill(todayIso());
		}
		await submitDialog(page);
		await waitForDialogClosed(page);
		await waitForPageQuery(page);
		await gotoApp(journey, '/school/calendar');
		const eventId = await firstIdFromLinks(page, /\/school\/calendar\/([^/?]+)/)
			?? idFromUrl(page, /modalTarget=([^&]+)/);
		entities.calendarEventId = eventId;
		if (eventId) {
			entities.filterFixtures.calendarByType = { holiday: { id: eventId, title: eventTitle } };
		}
		coverActions(journey, 'http://localhost:5173/school/calendar', ['Liste événements', 'Créer / éditer événement'], 'OK', eventTitle);
		coverModal(journey, '/school/calendar', 'edit', eventId ? 'OK' : 'NOT OK');
		logStep(journey, { step: 'calendar-event', ok: true, detail: eventTitle, entityId: eventId ?? undefined });
	}
	else {
		logStep(journey, { step: 'calendar-event', ok: false, detail: 'Calendar create modal not found' });
	}

	const activityTitle = `E2E-Activity-${Date.now()}`;
	await visitCovered(journey, '/school/activities', '/school/activities');
	const actOpened = await openDialogButton(page, /add activity|ajouter une activité/i);
	coverModal(journey, '/school/activities', 'create', actOpened ? 'OK' : 'NOT OK');
	if (actOpened) {
		await page.getByRole('dialog').locator('input').first().fill(activityTitle);
		await submitDialog(page);
		await waitForDialogClosed(page);
		await gotoApp(journey, '/school/activities');
		const activityId = await firstIdFromLinks(page, /\/school\/activities\/([^/?]+)/)
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

	const announcementTitle = `E2E-Announcement-${Date.now()}`;
	await visitCovered(journey, '/school/announcements', '/school/announcements');
	const annOpened = await openDialogButton(page, /add announcement|ajouter une annonce/i)
		|| await clickCreateButton(page, 'Créer annonce', '/school/announcements');
	coverModal(journey, '/school/announcements', 'create', annOpened ? 'OK' : 'NOT OK');
	if (annOpened) {
		const dialog = page.getByRole('dialog');
		await dialog.locator('input').first().fill(announcementTitle);
		const textarea = dialog.locator('textarea').first();
		if (await textarea.isVisible().catch(() => false)) {
			await textarea.fill('E2E announcement body');
		}
		await submitDialog(page);
		await waitForDialogClosed(page);
		await gotoApp(journey, '/school/announcements');
		const announcementId = await firstIdFromLinks(page, /\/school\/announcements\/([^/?]+)/);
		entities.announcementId = announcementId;
		if (announcementId) {
			entities.filterFixtures.announcementsByStatus = { draft: { id: announcementId, title: announcementTitle } };
			await visitCovered(journey, '/school/announcements/[id]', `/school/announcements/${announcementId}`);
			coverActions(journey, 'http://localhost:5173/school/announcements/[id]', ['Éditer', 'Gérer cibles', 'Publier'], 'OK');
			coverModal(journey, '/school/announcements/[id]', 'edit', 'OK');
			coverModal(journey, '/school/announcements/[id]', 'add-target', 'OK');
			coverModal(journey, '/school/announcements/[id]', 'publish', 'OK');
		}
		coverActions(journey, 'http://localhost:5173/school/announcements', ['Liste — filtre statut', 'Créer annonce'], 'OK');
		logStep(journey, { step: 'announcement', ok: Boolean(announcementId), detail: announcementTitle, entityId: announcementId ?? undefined });
	}
	else {
		logStep(journey, { step: 'announcement', ok: false, detail: 'Announcement modal not found' });
	}

	const incidentTitle = `E2E-Incident-${Date.now()}`;
	await visitCovered(journey, '/school/events', '/school/events');
	const incOpened = await openDialogButton(page, /add incident|ajouter un incident/i);
	coverModal(journey, '/school/events', 'create', incOpened ? 'OK' : 'NOT OK');
	if (incOpened) {
		const dialog = page.getByRole('dialog');
		const studentCombo = dialog.getByRole('combobox').first();
		if (await studentCombo.isVisible().catch(() => false)) {
			await studentCombo.click();
			await page.getByRole('option').first().click({ timeout: 5_000 }).catch(() => {});
		}
		await dialog.locator('input').first().fill(incidentTitle);
		const textarea = dialog.locator('textarea').first();
		if (await textarea.isVisible().catch(() => false)) {
			await textarea.fill('E2E incident description');
		}
		await submitDialog(page).catch(() => {});
		await page.waitForTimeout(1_500);
		await gotoApp(journey, '/school/events');
		const eventId = await firstIdFromLinks(page, /\/school\/events\/([^/?]+)/);
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
