import type { Page } from 'playwright';
import type { DemoContext } from '../tests/integration/demo-dry-run/support/types';
import type { SecondaryAccounts } from '../tests/integration/support/api-provision';
import type { QaTemplateRow } from './qa-template-matrix';

export type MatrixStatut = 'OK' | 'NOT OK' | 'N/A';

export interface MatrixResult {
	blocked?: boolean;
	id?: string;
	feature?: string;
	module: string;
	endpoint: string;
	action: string;
	statut: MatrixStatut;
	detail?: string;
}

export interface FilterFixtures {
	studentsByStatus?: Partial<Record<'active' | 'inactive' | 'archived', { id: string; lastName: string }>>;
	studentsByClass?: Record<string, { id: string; lastName: string; classId: string }>;
	searchToken?: string;
	calendarByType?: Record<string, { id: string; title: string }>;
	announcementsByStatus?: Record<string, { id: string; title: string }>;
	activitiesByCategory?: Record<string, { id: string; title: string }>;
	evaluationsByType?: Record<string, { id: string; title: string }>;
	attendanceByCompletion?: Record<string, { id: string; label: string }>;
	reportCardsByStatus?: Record<string, { id: string; label: string }>;
	feesByCategory?: Record<string, { id: string; name: string }>;
	paymentsByStatus?: Record<string, { id: string; label: string }>;
	paymentsByClass?: Record<string, { id: string; label: string }>;
	subjectsByGradeLevel?: Record<string, { id: string; name: string }>;
	disciplineByKind?: Record<string, { id: string; name: string }>;
	teachingSearchToken?: string;
	academicYearsByStatus?: Record<string, { id: string; label: string }>;
}

export interface MatrixEntities {
	classId: string | null;
	secondClassId: string | null;
	studentId: string | null;
	classStudentId: string | null;
	guardianId: string | null;
	staffId: string | null;
	teacherId: string | null;
	activityId: string | null;
	announcementId: string | null;
	conversationId?: string | null;
	eventId: string | null;
	calendarEventId: string | null;
	notificationTemplateKey: string | null;
	sessionId: string | null;
	timetableWeek: string | null;
	evaluationId: string | null;
	dayId: string | null;
	reportCardId: string | null;
	billingId: string | null;
	configClassId: string | null;
	gradeLevelId: string | null;
	secondGradeLevelId: string | null;
	subjectId: string | null;
	configurationSubjectId?: string | null;
	gradeScaleId: string | null;
	reportCardDefId: string | null;
	deliveryId: string | null;
	familyFeedbackCampaignId: string | null;
	teachingId: string | null;
	level: string | null;
	onboarded: boolean;
	hasDemoLogin: boolean;
	createdStudentId: string | null;
	studentSetupBlocked: boolean;
	filterFixtures: FilterFixtures;
	secondaryAccounts?: SecondaryAccounts;
}

export function emptyEntities(): MatrixEntities {
	return {
		classId: null,
		secondClassId: null,
		studentId: null,
		classStudentId: null,
		guardianId: null,
		staffId: null,
		teacherId: null,
		activityId: null,
		announcementId: null,
		conversationId: null,
		eventId: null,
		calendarEventId: null,
		notificationTemplateKey: 'report_card.published',
		sessionId: null,
		timetableWeek: null,
		evaluationId: null,
		dayId: null,
		reportCardId: null,
		billingId: null,
		configClassId: null,
		gradeLevelId: null,
		secondGradeLevelId: null,
		subjectId: null,
		gradeScaleId: null,
		reportCardDefId: null,
		deliveryId: null,
		familyFeedbackCampaignId: null,
		teachingId: null,
		level: null,
		onboarded: true,
		hasDemoLogin: false,
		createdStudentId: null,
		studentSetupBlocked: false,
		filterFixtures: {},
		secondaryAccounts: undefined,
	};
}

/** Setup-written entity keys win over discoverEntities() scrape results. */
export function mergeEntities(discovered: MatrixEntities, setup: Partial<MatrixEntities>): MatrixEntities {
	const merged: MatrixEntities = {
		...discovered,
		...setup,
		filterFixtures: {
			...discovered.filterFixtures,
			...setup.filterFixtures,
		},
	};

	for (const key of Object.keys(setup) as (keyof MatrixEntities)[]) {
		if (key === 'filterFixtures') continue;
		const value = setup[key];
		if (value !== null && value !== undefined && value !== false && value !== '') {
			(merged as unknown as Record<string, unknown>)[key as string] = value;
		}
	}

	return merged;
}

export function formatError(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

export async function waitForAppShell(page: Page): Promise<void> {
	const ready = page.locator('[data-testid="app-shell"], [data-onboarding-shell]').first();
	try {
		await ready.waitFor({ state: 'visible', timeout: 15_000 });
		return;
	}
	catch {
		// Layout may still be on the pending spinner before auth/bootstrap finishes.
	}
	const pending = page.getByTestId('app-shell-pending');
	if (await pending.isVisible().catch(() => false)) {
		await pending.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
	}
	await ready.waitFor({ state: 'visible', timeout: 15_000 });
}

export async function waitForAcademicYearTrigger(page: Page, timeout = 10_000): Promise<boolean> {
	const trigger = page.locator('[data-testid="academic-year-trigger"]')
		.or(page.getByRole('button', { name: /année|year|scolaire/i }));
	try {
		await trigger.first().waitFor({ state: 'visible', timeout });
		return true;
	}
	catch {
		return false;
	}
}

export async function assertNoFatalError(page: Page): Promise<string | null> {
	const alert = page.locator('[role="alert"]').filter({
		hasText: /something went wrong|une erreur est survenue|unable to load/i,
	});
	if (await alert.isVisible({ timeout: 1_500 }).catch(() => false)) {
		return (await alert.innerText().catch(() => 'Erreur fatale visible')).slice(0, 200);
	}
	return null;
}

export async function firstIdFromLinks(page: Page, pattern: RegExp): Promise<string | null> {
	const links = await page.locator('a[href]').all();
	for (const link of links.slice(0, 40)) {
		const href = await link.getAttribute('href');
		const match = href?.match(pattern);
		if (match?.[1]) {
			return match[1];
		}
	}
	return null;
}

/** Configuration rows expose a stable record id independently of typography. */
export async function firstIdFromConfigTable(page: Page, timeout = 8_000): Promise<string | null> {
	const row = page.locator('table tbody tr[data-entity-id]').first();
	try {
		await row.waitFor({ state: 'visible', timeout });
	} catch {
		return null;
	}
	const id = await row.getAttribute('data-entity-id');
	const trimmed = id?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : null;
}

export async function configEntityIdByName(page: Page, name: string): Promise<string | null> {
	const row = page.locator('table tbody tr[data-entity-id]').filter({ hasText: name });
	if (await row.first().isVisible().catch(() => false)) {
		const id = await row.first().getAttribute('data-entity-id');
		const trimmed = id?.trim();
		if (trimmed && trimmed.length > 0) {
			return trimmed;
		}
	}

	const link = page.locator('main a[href]').filter({ hasText: name }).first();
	if (await link.isVisible().catch(() => false)) {
		const href = await link.getAttribute('href');
		const match = href?.match(/\/configuration\/report-cards\/([^/?]+)/)
			?? href?.match(/\/([^/?]+)\/?$/);
		if (match?.[1] && match[1] !== 'report-cards') {
			return match[1];
		}
	}

	return null;
}

/** Family-feedback rows are buttons, not links — open the first campaign and parse the URL. */
export async function firstFamilyFeedbackCampaignIdFromList(page: Page): Promise<string | null> {
	const row = page.locator('ul li button[type="button"]').first();
	if (!(await row.isVisible().catch(() => false))) {
		return null;
	}
	await row.click();
	await page.waitForTimeout(800);
	const match = page.url().match(/\/school\/family-feedback\/([^/?]+)/);
	return match?.[1] ?? null;
}

/** Student roster uses ListEntityTable row buttons — navigate via click and parse URL. */
export async function firstStudentIdFromList(page: Page): Promise<string | null> {
	const row = page.locator('ul li [role="button"][tabindex="0"]').first();
	if (!(await row.isVisible().catch(() => false))) {
		return null;
	}
	await row.click();
	await page.waitForTimeout(800);
	const match = page.url().match(/\/school\/students\/([^/?]+)/)
		?? page.url().match(/\/classes\/[^/]+\/students\/([^/?]+)/);
	return match?.[1] ?? null;
}

/** Encode dynamic path segments (e.g. lesson session ids containing `:`). */
export function encodePathSegment(segment: string): string {
	return encodeURIComponent(segment);
}

/** Class-segment sidebar rows must start on a class page so tab hrefs resolve. */
export function sidebarSmokeStartPath(resolvedPath: string, classId: string | null | undefined): string {
	if (resolvedPath.startsWith('/classes/') && classId) {
		return `/classes/${classId}/students`;
	}
	return '/dashboard';
}

/** Class attendance tab is omitted unless the class uses daily roll call. */
export function isClassDailyAttendanceSidebarPath(resolvedPath: string): boolean {
	return /\/classes\/[^/]+\/attendance\/?$/.test(resolvedPath);
}

export function timetableWeekFromSessionId(sessionId: string | null): string | null {
	if (!sessionId?.includes(':')) {
		return null;
	}
	const week = sessionId.split(':').slice(1).join(':');
	return /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : null;
}

export function buildTimetableSessionPath(
	classId: string,
	sessionId: string,
	tab?: string,
	week?: string | null,
): string {
	const encodedSessionId = encodePathSegment(sessionId);
	const path = `/classes/${classId}/timetable/${encodedSessionId}${tab ? `/${tab}` : ''}`;
	const weekParam = week ?? timetableWeekFromSessionId(sessionId);
	return weekParam ? `${path}?week=${weekParam}` : path;
}

export function resolveEndpoint(endpoint: string, base: string, entities: MatrixEntities): string | null {
	if (endpoint === '(app)' || endpoint === '(multi-comptes)') {
		return null;
	}

	let path = endpoint.replace(/^https?:\/\/[^/]+/i, '');
	if (path.startsWith('http')) {
		path = new URL(endpoint).pathname + new URL(endpoint).search;
	}

	const map: Record<string, string | null> = {
		'[classId]': entities.classId,
		'[id]': entities.studentId,
		'[token]': 'qa-invalid-token',
		'[deliveryId]': entities.deliveryId,
		'[sessionId]': entities.sessionId,
		'[dayId]': entities.dayId,
		'[level]': entities.level ?? '6',
		'[role]': entities.staffId,
	};

	// Context-specific [id] on nested routes
	if (path.includes('/account/inbox/')) {
		map['[id]'] = entities.deliveryId;
	}
	if (path.includes('/classes/') && path.includes('/students/')) {
		map['[id]'] = entities.classStudentId ?? entities.studentId;
	}
	if (path.includes('/school/guardians/')) {
		map['[id]'] = entities.guardianId;
	}
	if (path.includes('/school/staff/')) {
		map['[id]'] = entities.staffId;
	}
	if (path.includes('/school/teachers/')) {
		map['[id]'] = entities.teacherId;
	}
	if (path.includes('/school/activities/')) {
		map['[id]'] = entities.activityId;
	}
	if (path.includes('/school/messages/')) {
		map['[id]'] = entities.conversationId ?? null;
	}
	if (path.includes('/school/announcements/')) {
		map['[id]'] = entities.announcementId;
	}
	if (path.includes('/school/events/')) {
		map['[id]'] = entities.eventId;
	}
	if (path.includes('/configuration/classes/')) {
		map['[id]'] = entities.configClassId;
	}
	if (path.includes('/configuration/grade-levels/')) {
		map['[id]'] = entities.gradeLevelId;
	}
	if (path.includes('/configuration/subjects/') && !path.includes('/level/')) {
		map['[id]'] = entities.configurationSubjectId ?? entities.subjectId;
	}
	if (path.includes('/configuration/report-cards/')) {
		map['[id]'] = entities.reportCardDefId;
	}
	if (path.includes('/configuration/notifications/')) {
		map['[id]'] = entities.notificationTemplateKey;
	}
	if (path.includes('/finance/billing/')) {
		map['[id]'] = entities.billingId;
	}
	if (path.includes('/school/family-feedback/')) {
		map['[id]'] = entities.familyFeedbackCampaignId;
	}
	if (path.includes('/evaluations/')) {
		map['[id]'] = entities.evaluationId;
	}
	if (path.includes('/teaching/') && path.includes('/classes/')) {
		map['[id]'] = entities.teachingId;
	}
	if (path.includes('/report-cards/') && path.includes('/classes/')) {
		map['[id]'] = entities.reportCardId;
	}

	for (const [token, value] of Object.entries(map)) {
		if (path.includes(token) && !value) {
			return null;
		}
		const replacement = token === '[sessionId]' && value
			? encodePathSegment(value)
			: (value ?? '');
		path = path.replaceAll(token, replacement);
	}

	const searchIndex = path.indexOf('?');
	const pathname = searchIndex >= 0 ? path.slice(0, searchIndex) : path;
	let search = searchIndex >= 0 ? path.slice(searchIndex) : '';

	const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
	const modal = params.get('modal');

	if (/\/timetable(?:\/|$)/.test(pathname) && entities.sessionId) {
		const week = entities.timetableWeek ?? timetableWeekFromSessionId(entities.sessionId);
		if (week && !params.has('week')) {
			params.set('week', week);
		}
	}

	if (modal === 'edit' && !params.get('modalTarget')) {
		if (pathname.includes('/school/calendar') && entities.calendarEventId) {
			params.set('modalTarget', entities.calendarEventId);
		}
	}

	const query = params.toString();
	search = query ? `?${query}` : '';

	return `${base}${pathname.startsWith('/') ? pathname : `/${pathname}`}${search}`;
}

export function rowKey(row: QaTemplateRow): string {
	return `${row.module}::${row.endpoint}::${row.action}`;
}

async function safeGoto(ctx: DemoContext, url: string): Promise<void> {
	if (!ctx.page.url().includes(new URL(url).pathname.split('?')[0] ?? '')) {
		await ctx.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
	}
	await waitForAppShell(ctx.page);
	await ctx.page.waitForTimeout(400);
}

export async function discoverEntities(ctx: DemoContext): Promise<MatrixEntities> {
	const { page, base } = ctx;
	const entities = emptyEntities();

	entities.onboarded = !page.url().includes('/onboarding');

	await safeGoto(ctx, `${base}/configuration/classes`);
	entities.configClassId = await firstIdFromConfigTable(page)
		?? await firstIdFromLinks(page, /\/configuration\/classes\/([^/]+)/);
	entities.classId = entities.configClassId ?? await firstIdFromLinks(page, /\/classes\/([^/]+)/);

	await safeGoto(ctx, `${base}/school/students`);
	entities.studentId = await firstStudentIdFromList(page)
		?? await firstIdFromLinks(page, /\/school\/students\/([^/]+)/);

	if (entities.classId) {
		await safeGoto(ctx, `${base}/classes/${entities.classId}/students`);
		entities.classStudentId = await firstStudentIdFromList(page)
			?? await firstIdFromLinks(
				page,
				new RegExp(`/classes/${entities.classId}/students/([^/]+)`),
			);
	}

	await safeGoto(ctx, `${base}/school/guardians`);
	entities.guardianId = await firstIdFromLinks(page, /\/school\/guardians\/([^/]+)/);

	await safeGoto(ctx, `${base}/school/staff`);
	entities.staffId = await firstIdFromLinks(page, /\/school\/staff\/([^/]+)/);

	await safeGoto(ctx, `${base}/school/teachers`);
	entities.teacherId = await firstIdFromLinks(page, /\/school\/teachers\/([^/]+)/);

	await safeGoto(ctx, `${base}/school/activities`);
	entities.activityId = await firstIdFromLinks(page, /\/school\/activities\/([^/]+)/);

	await safeGoto(ctx, `${base}/school/announcements`);
	entities.announcementId = await firstIdFromLinks(page, /\/school\/announcements\/([^/]+)/);

	await safeGoto(ctx, `${base}/school/messages`);
	entities.conversationId = await firstIdFromLinks(page, /\/school\/messages\/([^/]+)/);

	await safeGoto(ctx, `${base}/school/events`);
	entities.eventId = await firstIdFromLinks(page, /\/school\/events\/([^/]+)/);

	if (entities.classId) {
		await safeGoto(ctx, `${base}/classes/${entities.classId}/timetable`);
		entities.sessionId = await firstIdFromLinks(
			page,
			new RegExp(`/classes/${entities.classId}/timetable/([^/]+)`),
		);
		entities.timetableWeek = entities.sessionId
			? (entities.timetableWeek ?? timetableWeekFromSessionId(entities.sessionId))
			: null;

		await safeGoto(ctx, `${base}/classes/${entities.classId}/evaluations`);
		entities.evaluationId = await firstIdFromLinks(
			page,
			new RegExp(`/classes/${entities.classId}/evaluations/([^/]+)`),
		);

		await safeGoto(ctx, `${base}/classes/${entities.classId}/attendance`);
		entities.dayId = await firstIdFromLinks(
			page,
			new RegExp(`/classes/${entities.classId}/attendance/([^/]+)`),
		);

		await safeGoto(ctx, `${base}/classes/${entities.classId}/report-cards`);
		entities.reportCardId = await firstIdFromLinks(
			page,
			new RegExp(`/classes/${entities.classId}/report-cards/([^/]+)`),
		);

		await safeGoto(ctx, `${base}/classes/${entities.classId}/teaching`);
		entities.teachingId = await firstIdFromLinks(
			page,
			new RegExp(`/classes/${entities.classId}/teaching/([^/]+)`),
		);
	}

	await safeGoto(ctx, `${base}/finance/billing`);
	entities.billingId = await firstIdFromLinks(page, /\/finance\/billing\/([^/]+)/);

	await safeGoto(ctx, `${base}/configuration/grade-levels`);
	entities.gradeLevelId = await firstIdFromConfigTable(page)
		?? await firstIdFromLinks(page, /\/configuration\/grade-levels\/([^/]+)/);
	entities.level = entities.gradeLevelId;

	await safeGoto(ctx, `${base}/configuration/subjects`);
	entities.subjectId = await firstIdFromLinks(page, /\/configuration\/subjects\/([^/]+)/);

	await safeGoto(ctx, `${base}/configuration/report-cards`);
	entities.reportCardDefId = await firstIdFromLinks(page, /\/configuration\/report-cards\/([^/]+)/);

	await safeGoto(ctx, `${base}/account/inbox`);
	entities.deliveryId = await firstIdFromLinks(page, /\/account\/inbox\/([^/]+)/);

	await safeGoto(ctx, `${base}/school/family-feedback`);
	entities.familyFeedbackCampaignId = await firstFamilyFeedbackCampaignIdFromList(page);

	return entities;
}

export async function navigateToRow(
	ctx: DemoContext,
	row: QaTemplateRow,
	entities: MatrixEntities,
): Promise<{ url: string | null; reason?: string }> {
	const url = resolveEndpoint(row.endpoint, ctx.base, entities);
	if (!url) {
		return { url: null, reason: 'Entité requise introuvable (liste vide)' };
	}
	await ctx.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
	await waitForAppShell(ctx.page).catch(() => {});
	await ctx.page.waitForTimeout(500);
	return { url };
}
