import type { Page } from 'playwright';
/**
 * Authenticated API helpers for the owner UI journey (Playwright request context).
 * Used as fallbacks when drawer/modal UI flows are flaky.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { signUpAccount } from '../support/api-provision';
import { DEFAULT_API_URL } from '../support/integration-hosts';
import { schoolBearerFromPage } from '../support/playwright-identity';

const PROVISIONED_FIXTURE_PATH = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'../../../.integration-run/fixture.json',
);

async function readProvisionedFixtureSchoolId(): Promise<string | null> {
	if (process.env.INTEGRATION_PROVISIONED !== '1') {
		return null;
	}
	try {
		const raw = await readFile(PROVISIONED_FIXTURE_PATH, 'utf8');
		const fixture = JSON.parse(raw) as { schoolId?: string };
		return fixture.schoolId ?? null;
	}
	catch {
		return null;
	}
}

function isLikelyApiResponse(response: { headers: () => Record<string, string>; ok: () => boolean }): boolean {
	const contentType = response.headers()['content-type'] ?? '';
	if (contentType.includes('text/html')) {
		return false;
	}
	return contentType.includes('json') || response.ok();
}

interface JourneyApiResponse {
	ok: () => boolean;
	status: () => number;
	headers: () => Record<string, string>;
	json: () => Promise<unknown>;
	text: () => Promise<string>;
}

async function snapshotApiResponse(
	response: import('playwright').APIResponse,
): Promise<JourneyApiResponse> {
	const status = response.status();
	const ok = response.ok();
	const headers = response.headers();
	const bodyText = await response.text().catch(() => '');
	return {
		ok: () => ok,
		status: () => status,
		headers: () => headers,
		text: async () => bodyText,
		json: async () => JSON.parse(bodyText),
	};
}

export async function apiFetch(
	page: Page,
	appOrigin: string,
	path: string,
	init: { method?: string; data?: unknown; headers?: Record<string, string>; academicYearId?: string } = {},
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<JourneyApiResponse> {
	const appBase = appOrigin.replace(/\/+$/, '');
	const apiBase = apiUrl.replace(/\/+$/, '');
	const schoolId = await readProvisionedFixtureSchoolId();
	const headers: Record<string, string> = {
		'content-type': 'application/json',
		'accept': 'application/json',
		...init.headers,
	};
	if (schoolId) {
		headers['X-School-Id'] = schoolId;
	}
	if (init.academicYearId) {
		headers['X-Academic-Year-Id'] = init.academicYearId;
	}

	const accessToken = await schoolBearerFromPage(page, appOrigin, undefined, apiUrl);
	if (accessToken) {
		headers.authorization = `Bearer ${accessToken}`;
	}

	// Isolated request context: page.request can deadlock while a Wrangler SPA
	// navigation is still settling (announcement add-target hung the full suite).
	const { request } = await import('playwright');
	const isolated = await request.newContext({ extraHTTPHeaders: headers });

	// Vite proxies /core on the webapp origin. Wrangler SPA does not — prefer API_URL first.
	const bases: string[] = [];
	if (apiBase && apiBase !== appBase) {
		bases.push(apiBase);
	}
	bases.push(appBase);

	try {
		let last: JourneyApiResponse | undefined;
		for (const base of bases) {
			const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
			const raw = (init.method ?? 'GET') === 'POST'
				? await isolated.post(url, { headers, data: init.data ?? {} })
				: await isolated.get(url, { headers });
			last = await snapshotApiResponse(raw);
			if (isLikelyApiResponse(last)) {
				return last;
			}
			integrationDebug(`apiFetch skip ${last.status()} ${url}`);
		}
		return last!;
	}
	finally {
		await isolated.dispose();
	}
}

function parseEntityList<T extends { id?: string }>(
	body: { items?: T[] } | T[] | null,
): T[] {
	if (!body) {
		return [];
	}
	if (Array.isArray(body)) {
		return body;
	}
	return body.items ?? [];
}

function unwrapEntityBody(body: unknown): Record<string, unknown> | null {
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return null;
	}
	const record = body as Record<string, unknown>;
	const nested = record.data;
	if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
		const nestedRecord = nested as Record<string, unknown>;
		if (typeof nestedRecord.id === 'string' || typeof nestedRecord.academicYearId === 'string') {
			return nestedRecord;
		}
	}
	return record;
}

export async function resolveSchoolId(
	page: Page,
	appOrigin: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
	options?: { classGroupId?: string | null },
): Promise<string | null> {
	const fromFixture = await readProvisionedFixtureSchoolId();
	if (fromFixture) {
		return fromFixture;
	}

	const response = await apiFetch(page, appOrigin, '/core/entities/schools/list', {
		method: 'POST',
		data: {},
	}, apiUrl);
	if (response.ok()) {
		try {
			const body = await response.json() as { items?: Array<{ id?: string }> } | Array<{ id?: string }>;
			const fromList = parseEntityList(body)[0]?.id ?? null;
			if (fromList) {
				return fromList;
			}
		}
		catch {
			// fall through
		}
	}

	if (options?.classGroupId) {
		const classGroup = await getClassGroup(page, appOrigin, options.classGroupId, apiUrl);
		if (typeof classGroup?.schoolId === 'string') {
			return classGroup.schoolId;
		}
	}

	return null;
}

export async function ensureDailyAttendanceViaApi(
	page: Page,
	appOrigin: string,
	classGroupId: string,
	homeroomStaffId?: string | null,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<boolean> {
	const response = await apiFetch(page, appOrigin, '/core/commands/update-class-group-configuration', {
		method: 'POST',
		data: {
			classGroupId,
			attendanceMode: 'daily',
			...(homeroomStaffId ? { homeroomStaffId } : {}),
		},
	}, apiUrl);
	return response.ok();
}

export async function recordDailyAttendanceViaApi(
	page: Page,
	appOrigin: string,
	classGroupId: string,
	studentId?: string | null,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
	options?: {
		date?: string;
		attendanceByStudent?: Record<string, 'present' | 'absent' | 'late'>;
	},
): Promise<boolean> {
	const date = options?.date ?? new Date().toISOString().slice(0, 10);
	const attendanceByStudent = options?.attendanceByStudent
		?? (studentId ? { [studentId]: 'present' as const } : {});
	const response = await apiFetch(page, appOrigin, '/core/commands/record-class-daily-attendance', {
		method: 'POST',
		data: {
			classGroupId,
			date,
			attendanceByStudent,
		},
	}, apiUrl);
	return response.ok();
}

export async function resolveFirstPeriodId(
	page: Page,
	appOrigin: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<string | null> {
	const schoolId = await page.getByTestId('academic-year-trigger').getAttribute('data-school-id').catch(() => null);
	const fromSession = await page.evaluate((schoolId) =>
		(schoolId ? sessionStorage.getItem(`edaya:periodId:${schoolId}`) : null)
		?? sessionStorage.getItem('edaya:periodId'), schoolId).catch(() => null);
	if (fromSession) {
		return fromSession;
	}

	const resolvedSchoolId = schoolId ?? await resolveSchoolId(page, appOrigin, apiUrl);
	if (!resolvedSchoolId) {
		return null;
	}

	const response = await apiFetch(page, appOrigin, '/core/entities/academic-periods/list', {
		method: 'POST',
		data: { schoolId: resolvedSchoolId },
	}, apiUrl);
	if (!response.ok()) {
		return null;
	}
	try {
		const body = await response.json() as {
			items?: Array<{ id?: string; isPublished?: boolean; startDate?: string; endDate?: string }>;
		} | Array<{ id?: string; isPublished?: boolean; startDate?: string; endDate?: string }>;
		const periods = parseEntityList(body);
		if (periods.length === 0) {
			return null;
		}
		const today = new Date().toISOString().slice(0, 10);
		const inRange = periods.find((period) => {
			const start = period.startDate ? String(period.startDate).slice(0, 10) : '';
			const end = period.endDate ? String(period.endDate).slice(0, 10) : '';
			return start <= today && today <= end;
		});
		const published = periods.find(period => period.isPublished);
		return inRange?.id ?? published?.id ?? periods[0]?.id ?? null;
	}
	catch {
		return null;
	}
}

async function resolveAcademicYearScheduleDate(
	page: Page,
	appOrigin: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
	options?: { schoolId?: string | null; classGroupId?: string | null },
): Promise<string> {
	const schoolId = options?.schoolId
		?? await resolveSchoolId(page, appOrigin, apiUrl, { classGroupId: options?.classGroupId });
	if (!schoolId) {
		return new Date().toISOString().slice(0, 10);
	}
	const response = await apiFetch(page, appOrigin, '/core/entities/academic-years/list', {
		method: 'POST',
		data: { schoolId },
	}, apiUrl);
	if (!response.ok()) {
		return new Date().toISOString().slice(0, 10);
	}
	try {
		const body = await response.json() as {
			items?: Array<{ id?: string; status?: string; startDate?: string; endDate?: string }>;
		} | Array<{ id?: string; status?: string; startDate?: string; endDate?: string }>;
		const years = parseEntityList(body).filter(year => year.status === 'published');
		const year = years[0];
		if (!year?.startDate) {
			return new Date().toISOString().slice(0, 10);
		}
		const start = String(year.startDate).slice(0, 10);
		const end = year.endDate ? String(year.endDate).slice(0, 10) : start;
		const today = new Date().toISOString().slice(0, 10);
		if (today >= start && today <= end) {
			return today;
		}
		return start;
	}
	catch {
		return new Date().toISOString().slice(0, 10);
	}
}

interface AcademicYearListItem {
	id?: string;
	name?: string;
	status?: string;
}

async function listAcademicYearsViaApi(
	page: Page,
	appOrigin: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<AcademicYearListItem[]> {
	const schoolId = await resolveSchoolId(page, appOrigin, apiUrl);
	if (!schoolId) {
		console.log('academic-year API list skipped: no schoolId');
		return [];
	}
	const response = await apiFetch(page, appOrigin, '/core/entities/academic-years/list', {
		method: 'POST',
		data: { schoolId, $limit: 50, $offset: 0 },
	}, apiUrl);
	if (!response.ok()) {
		console.log(
			`academic-year API list failed: status=${response.status()} body=${(await response.text().catch(() => '')).slice(0, 300)}`,
		);
		return [];
	}
	try {
		return parseEntityList(await response.json() as { items?: AcademicYearListItem[] } | AcademicYearListItem[]);
	}
	catch {
		return [];
	}
}

/**
 * Archive blocking published years and publish the draft matching `label`.
 * Used when the academic-page URL modal leaves the heading unclickable on Wrangler.
 */
export async function ensureAcademicYearPublishedViaApi(
	page: Page,
	appOrigin: string,
	label: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<boolean> {
	const years = await listAcademicYearsViaApi(page, appOrigin, apiUrl);
	console.log(
		`academic-year API list: ${years.map(year => `${year.name ?? '?'}[${year.status ?? '?'}]`).join(', ') || '(empty)'}`,
	);
	const target = years.find(year => year.name === label)
		?? years.find(year => year.status === 'draft')
		?? years[0];
	if (!target?.id) {
		console.log(`academic-year API publish skipped: no year matching ${label}`);
		return false;
	}
	if (target.status === 'published') {
		return true;
	}

	for (const year of years) {
		if (year.status !== 'published' || !year.id || year.id === target.id) {
			continue;
		}
		const archived = await apiFetch(page, appOrigin, '/core/commands/archive-academic-year', {
			method: 'POST',
			data: { academicYearId: year.id },
		}, apiUrl);
		console.log(`academic-year API archive ${year.name ?? year.id}: status=${archived.status()}`);
		if (!archived.ok()) {
			console.log(`academic-year API archive body: ${(await archived.text().catch(() => '')).slice(0, 300)}`);
		}
	}

	const published = await apiFetch(page, appOrigin, '/core/commands/publish-academic-year', {
		method: 'POST',
		data: { academicYearId: target.id },
	}, apiUrl);
	console.log(`academic-year API publish ${target.name ?? target.id}: status=${published.status()}`);
	if (!published.ok()) {
		console.log(`academic-year API publish body: ${(await published.text().catch(() => '')).slice(0, 400)}`);
		return false;
	}
	return true;
}

export async function ensureNotificationTemplatesViaApi(
	page: Page,
	appOrigin: string,
	options: {
		schoolId?: string | null;
		classGroupId?: string | null;
	} = {},
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<boolean> {
	const schoolId = options.schoolId
		?? await resolveSchoolId(page, appOrigin, apiUrl, { classGroupId: options.classGroupId });
	if (!schoolId) {
		integrationDebug('ensureNotificationTemplatesViaApi: no schoolId');
		return false;
	}
	const response = await apiFetch(page, appOrigin, '/core/commands/reset-school-notification-templates', {
		method: 'POST',
		data: { schoolId },
	}, apiUrl);
	if (!response.ok()) {
		integrationDebug(
			'reset-school-notification-templates failed',
			response.status(),
			await response.text().catch(() => ''),
		);
	}
	return response.ok();
}

function integrationDebug(...args: unknown[]): void {
	if (process.env.INTEGRATION_DEBUG === '1') {
		console.log('[journey-api]', ...args);
	}
}

async function readApiBody(response: JourneyApiResponse): Promise<unknown> {
	try {
		return await response.json();
	}
	catch {
		return null;
	}
}

export async function listClassSubjects(
	page: Page,
	appOrigin: string,
	classGroupId: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<Array<{ id: string; subjectId?: string; isOffered?: boolean }>> {
	const response = await apiFetch(page, appOrigin, '/core/entities/class-subjects/list', {
		method: 'POST',
		data: { classGroupId },
	}, apiUrl);
	if (!response.ok()) {
		integrationDebug('listClassSubjects failed', response.status(), await response.text().catch(() => ''));
		return [];
	}
	const body = await readApiBody(response) as { items?: Array<{ id?: string; subjectId?: string; isOffered?: boolean }> }
		| Array<{ id?: string; subjectId?: string; isOffered?: boolean }>;
	return parseEntityList(body).filter((entry): entry is { id: string; subjectId?: string; isOffered?: boolean } =>
		typeof entry.id === 'string',
	);
}

async function resolveCatalogSubjectId(
	page: Page,
	appOrigin: string,
	gradeLevelSubjectId: string,
	apiUrl: string,
): Promise<string | null> {
	const response = await apiFetch(
		page,
		appOrigin,
		`/core/entities/grade-level-subjects/${encodeURIComponent(gradeLevelSubjectId)}`,
		{},
		apiUrl,
	);
	if (!response.ok()) {
		return null;
	}
	const body = await readApiBody(response) as { subjectId?: string } | null;
	return typeof body?.subjectId === 'string' ? body.subjectId : null;
}

export async function ensureClassSubjectForClass(
	page: Page,
	appOrigin: string,
	options: {
		classGroupId: string;
		gradeLevelSubjectId?: string | null;
		catalogSubjectId?: string | null;
	},
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<string | null> {
	const existing = await listClassSubjects(page, appOrigin, options.classGroupId, apiUrl);
	const offered = existing.find(entry => entry.isOffered !== false) ?? existing[0];
	if (offered?.id) {
		return offered.id;
	}

	let catalogSubjectId = options.catalogSubjectId ?? null;
	if (!catalogSubjectId && options.gradeLevelSubjectId) {
		catalogSubjectId = await resolveCatalogSubjectId(page, appOrigin, options.gradeLevelSubjectId, apiUrl);
	}
	if (!catalogSubjectId) {
		integrationDebug('ensureClassSubjectForClass: no catalog subjectId');
		return null;
	}

	const classSubjectId = `cs-e2e-${Date.now().toString(36)}`;
	const offerResponse = await apiFetch(page, appOrigin, '/core/commands/offer-subject-to-class', {
		method: 'POST',
		data: {
			id: classSubjectId,
			classGroupId: options.classGroupId,
			subjectId: catalogSubjectId,
			gradeLevelSubjectId: options.gradeLevelSubjectId ?? null,
			isOffered: true,
		},
	}, apiUrl);
	if (!offerResponse.ok()) {
		integrationDebug('offer-subject-to-class failed', offerResponse.status(), await offerResponse.text().catch(() => ''));
		const refreshed = await listClassSubjects(page, appOrigin, options.classGroupId, apiUrl);
		return refreshed[0]?.id ?? null;
	}

	try {
		const body = await readApiBody(offerResponse) as { id?: string };
		if (typeof body?.id === 'string') {
			return body.id;
		}
	}
	catch {
		// fall through
	}
	return classSubjectId;
}

export async function lessonSessionExists(
	page: Page,
	appOrigin: string,
	sessionId: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<boolean> {
	const response = await apiFetch(
		page,
		appOrigin,
		`/core/entities/lesson-sessions/${encodeURIComponent(sessionId)}`,
		{},
		apiUrl,
	);
	return response.ok();
}

async function pickLessonSessionForClass(
	page: Page,
	appOrigin: string,
	classGroupId: string,
	scheduleDate: string,
	apiUrl: string,
	classSubjectId?: string,
): Promise<string | null> {
	const listed = await listLessonSessionIdsForClass(page, appOrigin, classGroupId, apiUrl, classSubjectId);
	const match = listed.find(id => id.includes(scheduleDate)) ?? listed[0];
	if (!match) {
		return null;
	}
	if (await lessonSessionExists(page, appOrigin, match, apiUrl)) {
		return match;
	}
	return match;
}

async function listLessonSessionIdsForClass(
	page: Page,
	appOrigin: string,
	classGroupId: string,
	apiUrl: string,
	classSubjectId?: string,
): Promise<string[]> {
	const response = await apiFetch(page, appOrigin, '/core/entities/lesson-sessions/list', {
		method: 'POST',
		data: { classGroupId, ...(classSubjectId ? { classSubjectId } : {}) },
	}, apiUrl);
	if (!response.ok()) {
		return [];
	}
	const body = await readApiBody(response) as { items?: Array<{ id?: string }> } | Array<{ id?: string }>;
	return parseEntityList(body)
		.map(entry => entry.id)
		.filter((id): id is string => typeof id === 'string');
}

async function getClassGroup(
	page: Page,
	appOrigin: string,
	classGroupId: string,
	apiUrl: string,
): Promise<{ academicYearId?: string; homeroomStaffId?: string | null; schoolId?: string } | null> {
	const response = await apiFetch(
		page,
		appOrigin,
		`/core/entities/class-groups/${encodeURIComponent(classGroupId)}`,
		{},
		apiUrl,
	);
	if (!response.ok()) {
		return null;
	}
	const body = unwrapEntityBody(await readApiBody(response));
	if (!body) {
		return null;
	}
	return {
		academicYearId: typeof body.academicYearId === 'string' ? body.academicYearId : undefined,
		homeroomStaffId: typeof body.homeroomStaffId === 'string' ? body.homeroomStaffId : null,
		schoolId: typeof body.schoolId === 'string' ? body.schoolId : undefined,
	};
}

async function ensureStaffAssignedToClassSubject(
	page: Page,
	appOrigin: string,
	classGroupId: string,
	classSubjectId: string,
	apiUrl: string,
): Promise<void> {
	const classGroup = await getClassGroup(page, appOrigin, classGroupId, apiUrl);
	if (!classGroup?.homeroomStaffId || !classGroup.academicYearId) {
		return;
	}

	const existing = await apiFetch(page, appOrigin, '/core/entities/staff-assignments/list', {
		method: 'POST',
		data: { classSubjectId },
	}, apiUrl);
	if (existing.ok()) {
		const body = await readApiBody(existing) as { items?: Array<{ id?: string }> } | Array<{ id?: string }>;
		if (parseEntityList(body).length > 0) {
			return;
		}
	}

	await apiFetch(page, appOrigin, '/core/commands/assign-staff-to-class-subject', {
		method: 'POST',
		data: {
			id: `sa-e2e-${Date.now().toString(36)}`,
			staffId: classGroup.homeroomStaffId,
			academicYearId: classGroup.academicYearId,
			responsibility: 'teacher',
			permissions: [],
			classSubjectId,
		},
	}, apiUrl);
}

async function createLessonSessionDirect(
	page: Page,
	appOrigin: string,
	options: {
		schoolId: string;
		classGroupId: string;
		classSubjectId: string;
		scheduleDate: string;
		title: string;
	},
	apiUrl: string,
): Promise<string | null> {
	const sessionId = `ls-e2e-${Date.now().toString(36)}:${options.scheduleDate}`;
	const response = await apiFetch(page, appOrigin, '/core/entities/lesson-sessions/save', {
		method: 'POST',
		data: {
			id: sessionId,
			schoolId: options.schoolId,
			classGroupId: options.classGroupId,
			classSubjectId: options.classSubjectId,
			status: 'pending',
			isException: false,
			startsAt: `${options.scheduleDate}T08:00:00.000Z`,
			endsAt: `${options.scheduleDate}T09:00:00.000Z`,
			displayLabel: options.title,
			timetableTeacherIds: [],
		},
	}, apiUrl);
	if (!response.ok()) {
		const errorBody = await response.text().catch(() => '');
		integrationDebug('lesson-sessions/save failed', response.status(), errorBody);
		if (response.status() === 409) {
			const existing = await pickLessonSessionForClass(
				page,
				appOrigin,
				options.classGroupId,
				options.scheduleDate,
				apiUrl,
			);
			if (existing) {
				return existing;
			}
		}
		return null;
	}
	return (await lessonSessionExists(page, appOrigin, sessionId, apiUrl)) ? sessionId : null;
}

function parseLessonSessionIdsFromMaterialize(body: unknown, scheduleDate: string): string[] {
	const ids: string[] = [];
	if (Array.isArray(body)) {
		for (const entry of body) {
			if (entry && typeof entry === 'object' && 'id' in entry && typeof (entry as { id: unknown }).id === 'string') {
				ids.push((entry as { id: string }).id);
			}
		}
	}
	else if (body && typeof body === 'object' && 'id' in body && typeof (body as { id: unknown }).id === 'string') {
		ids.push((body as { id: string }).id);
	}
	const dated = ids.find(id => id.includes(scheduleDate));
	return dated ? [dated] : ids;
}

export interface TimetableSessionResult {
	sessionId: string;
	scheduleDate: string;
}

export async function ensureTimetableSession(
	page: Page,
	appOrigin: string,
	options: {
		classGroupId: string;
		classSubjectId?: string | null;
		gradeLevelSubjectId?: string | null;
		catalogSubjectId?: string | null;
		title?: string;
		schoolId?: string | null;
	},
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<TimetableSessionResult | null> {
	const schoolId = options.schoolId ?? await resolveSchoolId(page, appOrigin, apiUrl, {
		classGroupId: options.classGroupId,
	});
	if (!schoolId) {
		console.warn('[journey-api] ensureTimetableSession: no schoolId', { classGroupId: options.classGroupId });
		integrationDebug('ensureTimetableSession: no schoolId');
		return null;
	}

	const classSubjectId = options.classSubjectId
		?? await ensureClassSubjectForClass(page, appOrigin, {
			classGroupId: options.classGroupId,
			gradeLevelSubjectId: options.gradeLevelSubjectId,
			catalogSubjectId: options.catalogSubjectId,
		}, apiUrl);
	if (!classSubjectId) {
		integrationDebug('ensureTimetableSession: no classSubjectId');
		return null;
	}

	await ensureStaffAssignedToClassSubject(page, appOrigin, options.classGroupId, classSubjectId, apiUrl);

	const scheduleId = `sch-e2e-${Date.now().toString(36)}`;
	const title = options.title ?? `E2E-Session-${Date.now()}`;
	const scheduleDate = await resolveAcademicYearScheduleDate(page, appOrigin, apiUrl, {
		schoolId,
		classGroupId: options.classGroupId,
	});

	const existingSession = await pickLessonSessionForClass(
		page,
		appOrigin,
		options.classGroupId,
		scheduleDate,
		apiUrl,
		classSubjectId,
	);
	if (existingSession) {
		const response = await apiFetch(page, appOrigin, `/core/entities/lesson-sessions/${encodeURIComponent(existingSession)}`, {}, apiUrl);
		const session = unwrapEntityBody(await readApiBody(response));
		const startsAt = typeof session?.startsAt === 'string' ? session.startsAt : null;
		return startsAt ? { sessionId: existingSession, scheduleDate: startsAt.slice(0, 10) } : null;
	}

	const directId = await createLessonSessionDirect(page, appOrigin, {
		schoolId,
		classGroupId: options.classGroupId,
		classSubjectId,
		scheduleDate,
		title,
	}, apiUrl);
	if (directId) {
		return { sessionId: directId, scheduleDate };
	}

	const schedulePayload = {
		id: scheduleId,
		schoolId,
		classGroupId: options.classGroupId,
		scheduleKind: 'lesson' as const,
		classSubjectId,
		title,
		isRecurring: false,
		specificDate: scheduleDate,
		startTime: '08:00',
		endTime: '09:00',
	};

	let materializedIds: string[] = [];
	const saveResponse = await apiFetch(page, appOrigin, '/core/commands/save-schedule', {
		method: 'POST',
		data: { schedule: schedulePayload, materialize: true },
	}, apiUrl);
	if (saveResponse.ok()) {
		materializedIds = parseLessonSessionIdsFromMaterialize(await readApiBody(saveResponse), scheduleDate);
	}
	else {
		integrationDebug('save-schedule failed', saveResponse.status(), await saveResponse.text().catch(() => ''));
		const legacyCreate = await apiFetch(page, appOrigin, '/core/commands/create-schedule', {
			method: 'POST',
			data: schedulePayload,
		}, apiUrl);
		if (!legacyCreate.ok()) {
			integrationDebug('create-schedule failed', legacyCreate.status(), await legacyCreate.text().catch(() => ''));
		}
	}

	if (materializedIds.length === 0) {
		const materializeResponse = await apiFetch(page, appOrigin, '/core/commands/materialize-schedule', {
			method: 'POST',
			data: { scheduleId },
		}, apiUrl);
		if (materializeResponse.ok()) {
			materializedIds = parseLessonSessionIdsFromMaterialize(await readApiBody(materializeResponse), scheduleDate);
		}
		else {
			integrationDebug('materialize-schedule failed', materializeResponse.status(), await materializeResponse.text().catch(() => ''));
		}
	}

	for (const candidate of materializedIds) {
		if (await lessonSessionExists(page, appOrigin, candidate, apiUrl)) {
			return { sessionId: candidate, scheduleDate };
		}
	}

	const fallbackId = `${scheduleId}:${scheduleDate}`;
	if (await lessonSessionExists(page, appOrigin, fallbackId, apiUrl)) {
		return { sessionId: fallbackId, scheduleDate };
	}

	const fromList = await pickLessonSessionForClass(
		page,
		appOrigin,
		options.classGroupId,
		scheduleDate,
		apiUrl,
		classSubjectId,
	);
	if (fromList) {
		return { sessionId: fromList, scheduleDate };
	}

	const retryDirectId = await createLessonSessionDirect(page, appOrigin, {
		schoolId,
		classGroupId: options.classGroupId,
		classSubjectId,
		scheduleDate,
		title,
	}, apiUrl);
	if (retryDirectId) {
		return { sessionId: retryDirectId, scheduleDate };
	}

	console.warn('[journey-api] ensureTimetableSession: no verified lesson session', {
		classGroupId: options.classGroupId,
		classSubjectId,
		scheduleDate,
	});
	integrationDebug('ensureTimetableSession: no verified lesson session');
	return null;
}

export async function createTimetableSessionViaApi(
	page: Page,
	appOrigin: string,
	options: {
		classGroupId: string;
		classSubjectId?: string | null;
		gradeLevelSubjectId?: string | null;
		title?: string;
		schoolId?: string | null;
	},
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<string | null> {
	const result = await ensureTimetableSession(page, appOrigin, options, apiUrl);
	return result?.sessionId ?? null;
}

export async function addAnnouncementTargetViaApi(
	page: Page,
	appOrigin: string,
	announcementId: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<boolean> {
	const targetId = `tgt-e2e-${Date.now().toString(36)}`;
	const addTarget = await apiFetch(page, appOrigin, '/core/commands/add-target', {
		method: 'POST',
		data: {
			id: targetId,
			announcementId,
			targetKind: 'school',
		},
	}, apiUrl);
	if (!addTarget.ok()) {
		const body = await addTarget.text().catch(() => '');
		integrationDebug(`add-target failed ${addTarget.status()} ${body.slice(0, 200)}`);
		return false;
	}
	return true;
}

export async function publishAnnouncementCommandViaApi(
	page: Page,
	appOrigin: string,
	announcementId: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<boolean> {
	const publish = await apiFetch(page, appOrigin, '/core/commands/publish-announcement', {
		method: 'POST',
		data: { announcementId },
	}, apiUrl);
	if (!publish.ok()) {
		const body = await publish.text().catch(() => '');
		integrationDebug(`publish-announcement failed ${publish.status()} ${body.slice(0, 200)}`);
	}
	return publish.ok();
}

export async function publishAnnouncementViaApi(
	page: Page,
	appOrigin: string,
	announcementId: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<boolean> {
	if (!await addAnnouncementTargetViaApi(page, appOrigin, announcementId, apiUrl)) {
		return false;
	}
	return publishAnnouncementCommandViaApi(page, appOrigin, announcementId, apiUrl);
}

export async function publishReportCardDefinitionViaApi(
	page: Page,
	appOrigin: string,
	definitionId: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<boolean> {
	const getResponse = await apiFetch(
		page,
		appOrigin,
		`/core/entities/definitions/${encodeURIComponent(definitionId)}`,
		{},
		apiUrl,
	);
	if (!getResponse.ok()) {
		return false;
	}
	let definition: Record<string, unknown>;
	try {
		definition = await getResponse.json() as Record<string, unknown>;
	}
	catch {
		return false;
	}

	const saveResponse = await apiFetch(page, appOrigin, '/core/entities/definitions/save', {
		method: 'POST',
		data: { ...definition, status: 'published' },
	}, apiUrl);
	return saveResponse.ok();
}

export async function generateReportCardViaApi(
	page: Page,
	appOrigin: string,
	options: {
		reportCardDefinitionId: string;
		studentId: string;
		periodId?: string | null;
	},
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<string | null> {
	const periodId = options.periodId ?? await resolveFirstPeriodId(page, appOrigin, apiUrl);
	if (!periodId) {
		return null;
	}
	const id = `rcr-${options.studentId}-${periodId}`;
	const response = await apiFetch(page, appOrigin, '/core/commands/generate-report-card-result', {
		method: 'POST',
		data: {
			id,
			reportCardDefinitionId: options.reportCardDefinitionId,
			studentId: options.studentId,
			periodId,
		},
	}, apiUrl);
	if (!response.ok()) {
		return null;
	}
	try {
		const body = await response.json() as { id?: string };
		return typeof body.id === 'string' ? body.id : id;
	}
	catch {
		return id;
	}
}

async function listPendingInvitationsForTarget(
	page: Page,
	appOrigin: string,
	targetId: string,
	apiUrl: string,
): Promise<Array<{ id?: string; targetId?: string; status?: string }>> {
	const schoolId = await resolveSchoolId(page, appOrigin, apiUrl);
	const filters: Array<Record<string, string>> = [];
	if (schoolId) {
		filters.push({ schoolId, targetId });
		filters.push({ schoolId });
	}
	filters.push({ targetId });
	filters.push({});

	for (const data of filters) {
		const listResponse = await apiFetch(page, appOrigin, '/core/entities/account-invitations/list', {
			method: 'POST',
			data,
		}, apiUrl);
		if (!listResponse.ok()) {
			continue;
		}
		try {
			const body = await listResponse.json() as {
				items?: Array<{ id?: string; targetId?: string; status?: string }>;
			} | Array<{ id?: string; targetId?: string; status?: string }>;
			const invitations = parseEntityList(body)
				.filter(entry => entry.targetId === targetId && entry.status === 'pending');
			if (invitations.length > 0) {
				return invitations;
			}
		}
		catch {
			continue;
		}
	}
	return [];
}

export async function linkActorSubjectViaApi(
	page: Page,
	appOrigin: string,
	payload: {
		subjectId: string;
		teacherId?: string;
		staffMemberId?: string;
		guardianId?: string;
		studentId?: string;
	},
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<boolean> {
	const response = await apiFetch(page, appOrigin, '/core/commands/link-actor-subject', {
		method: 'POST',
		data: payload,
	}, apiUrl);
	return response.ok();
}

export async function resendInvitationTokenViaApi(
	page: Page,
	appOrigin: string,
	targetId: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<string | null> {
	const invitations = await listPendingInvitationsForTarget(page, appOrigin, targetId, apiUrl);
	const invitationId = invitations[0]?.id ?? null;
	if (!invitationId) {
		return null;
	}

	const resendResponse = await apiFetch(page, appOrigin, '/core/commands/resend-account-invitation', {
		method: 'POST',
		data: { invitationId },
	}, apiUrl);
	if (!resendResponse.ok()) {
		return null;
	}
	try {
		const body = await resendResponse.json() as { token?: string };
		return typeof body.token === 'string' ? body.token : null;
	}
	catch {
		return null;
	}
}

export async function createTeacherWithInvitationViaApi(
	page: Page,
	appOrigin: string,
	email: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<{ teacherId: string; token: string } | null> {
	const schoolId = await resolveSchoolId(page, appOrigin, apiUrl);
	if (!schoolId) {
		return null;
	}

	const teacherId = `tch-e2e-${Date.now().toString(36)}`;
	const saveResponse = await apiFetch(page, appOrigin, '/core/entities/teachers/save', {
		method: 'POST',
		data: {
			id: teacherId,
			schoolId,
			firstName: 'E2E',
			lastName: `Teacher-${Date.now()}`,
			email,
			phone: null,
			isActive: true,
		},
	}, apiUrl);
	if (!saveResponse.ok()) {
		return null;
	}

	const inviteResponse = await apiFetch(page, appOrigin, '/core/commands/send-account-invitation', {
		method: 'POST',
		data: {
			kind: 'teacher',
			targetId: teacherId,
			contactChannel: 'email',
			contactValue: email,
		},
	}, apiUrl);
	let token = '';
	if (inviteResponse.ok()) {
		try {
			const body = await inviteResponse.json() as { token?: string };
			token = typeof body.token === 'string' ? body.token : '';
		}
		catch {
			token = '';
		}
	}
	if (!token) {
		token = await resendInvitationTokenViaApi(page, appOrigin, teacherId, apiUrl) ?? '';
	}
	return { teacherId, token };
}

interface TeacherAssignmentListItem {
	id?: string;
	teacherId?: string;
	classSubjectId?: string | null;
	kind?: string;
	status?: string;
}

async function readStoredAcademicYearId(page: Page): Promise<string | null> {
	return page.evaluate(() => {
		const direct = sessionStorage.getItem('edaya:yearId');
		if (direct) {
			return direct;
		}
		for (let index = 0; index < sessionStorage.length; index += 1) {
			const key = sessionStorage.key(index);
			if (!key?.startsWith('edaya:yearId:')) {
				continue;
			}
			const value = sessionStorage.getItem(key);
			if (value) {
				return value;
			}
		}
		return null;
	}).catch(() => null);
}

async function listFamilyFeedbackCampaignIds(
	page: Page,
	appOrigin: string,
	apiUrl: string,
): Promise<string[]> {
	const academicYearId = await readStoredAcademicYearId(page);
	const response = await apiFetch(page, appOrigin, '/core/queries/list-family-feedback-campaigns', {
		method: 'POST',
		data: {},
		academicYearId: academicYearId ?? undefined,
	}, apiUrl);
	if (!response.ok()) {
		console.log(
			`family-feedback list failed: status=${response.status()} body=${(await response.text().catch(() => '')).slice(0, 300)}`,
		);
		return [];
	}
	const body = await readApiBody(response);
	const rows = asRecordList(body);
	const ids = rows
		.map(entry => entry.id)
		.filter((id): id is string => typeof id === 'string' && id.length > 0);
	if (ids.length === 0) {
		console.log(`family-feedback list empty: body=${JSON.stringify(body).slice(0, 300)}`);
	}
	return ids;
}

function asRecordList(value: unknown): Record<string, unknown>[] {
	if (Array.isArray(value)) {
		return value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object');
	}
	if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)) {
		return asRecordList((value as { items: unknown }).items);
	}
	if (value && typeof value === 'object' && Array.isArray((value as { campaigns?: unknown }).campaigns)) {
		return asRecordList((value as { campaigns: unknown }).campaigns);
	}
	if (value && typeof value === 'object' && (value as { data?: unknown }).data) {
		return asRecordList((value as { data: unknown }).data);
	}
	return [];
}

export async function cancelFamilyFeedbackCampaignsViaApi(
	page: Page,
	appOrigin: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<void> {
	const ids = await listFamilyFeedbackCampaignIds(page, appOrigin, apiUrl);
	const academicYearId = await readStoredAcademicYearId(page);
	console.log(`family-feedback cancel candidates: ${ids.join(', ') || '(none)'}`);
	for (const id of ids) {
		let cleared = false;
		for (const command of ['cancel-family-feedback-campaign', 'archive-family-feedback-campaign'] as const) {
			const response = await apiFetch(page, appOrigin, `/core/commands/${command}`, {
				method: 'POST',
				data: { requestId: crypto.randomUUID(), id },
				academicYearId: academicYearId ?? undefined,
			}, apiUrl);
			console.log(`family-feedback ${command} ${id}: status=${response.status()}`);
			if (response.ok()) {
				cleared = true;
				if (command === 'cancel-family-feedback-campaign') {
					const archived = await apiFetch(page, appOrigin, '/core/commands/archive-family-feedback-campaign', {
						method: 'POST',
						data: { requestId: crypto.randomUUID(), id },
						academicYearId: academicYearId ?? undefined,
					}, apiUrl);
					console.log(`family-feedback archive after cancel ${id}: status=${archived.status()}`);
				}
				break;
			}
			console.log(`family-feedback ${command} body: ${(await response.text().catch(() => '')).slice(0, 200)}`);
		}
		if (!cleared) {
			console.log(`family-feedback could not clear ${id}; a later create will use a fresh assignment`);
		}
	}
}

async function resolvePeriodIdForYear(
	page: Page,
	appOrigin: string,
	academicYearId: string,
	apiUrl: string,
): Promise<string | null> {
	const schoolId = await resolveSchoolId(page, appOrigin, apiUrl);
	if (!schoolId) {
		return null;
	}
	const response = await apiFetch(page, appOrigin, '/core/entities/academic-periods/list', {
		method: 'POST',
		data: { schoolId, academicYearId },
		academicYearId,
	}, apiUrl);
	if (!response.ok()) {
		console.log(
			`family-feedback period list failed: status=${response.status()} body=${(await response.text().catch(() => '')).slice(0, 300)}`,
		);
		return null;
	}
	try {
		const body = await response.json() as {
			items?: Array<{ id?: string; academicYearId?: string; isPublished?: boolean; startDate?: string; endDate?: string }>;
		} | Array<{ id?: string; academicYearId?: string; isPublished?: boolean; startDate?: string; endDate?: string }>;
		const periods = parseEntityList(body).filter(period =>
			!period.academicYearId || period.academicYearId === academicYearId,
		);
		if (periods.length === 0) {
			return null;
		}
		const today = new Date().toISOString().slice(0, 10);
		const inRange = periods.find((period) => {
			const start = period.startDate ? String(period.startDate).slice(0, 10) : '';
			const end = period.endDate ? String(period.endDate).slice(0, 10) : '';
			return start <= today && today <= end;
		});
		const published = periods.find(period => period.isPublished);
		return inRange?.id ?? published?.id ?? periods[0]?.id ?? null;
	}
	catch {
		return null;
	}
}

async function teacherExistsViaApi(
	page: Page,
	appOrigin: string,
	teacherId: string,
	apiUrl: string,
): Promise<boolean> {
	const response = await apiFetch(
		page,
		appOrigin,
		`/core/entities/teachers/${encodeURIComponent(teacherId)}`,
		{},
		apiUrl,
	);
	return response.ok();
}

async function createTeacherForFamilyFeedback(
	page: Page,
	appOrigin: string,
	apiUrl: string,
): Promise<string | null> {
	const schoolId = await resolveSchoolId(page, appOrigin, apiUrl);
	if (!schoolId) {
		return null;
	}
	const createdId = `tch-ff-${Date.now().toString(36)}`;
	const saveResponse = await apiFetch(page, appOrigin, '/core/entities/teachers/save', {
		method: 'POST',
		data: {
			id: createdId,
			schoolId,
			firstName: 'E2E',
			lastName: `Feedback-${Date.now().toString(36)}`,
			email: null,
			phone: null,
			isActive: true,
		},
	}, apiUrl);
	if (!saveResponse.ok()) {
		console.log(
			`family-feedback teacher save failed: status=${saveResponse.status()} body=${(await saveResponse.text().catch(() => '')).slice(0, 300)}`,
		);
		return null;
	}
	return createdId;
}

async function ensureTeacherForFamilyFeedback(
	page: Page,
	appOrigin: string,
	teacherId: string | null | undefined,
	apiUrl: string,
): Promise<string | null> {
	if (teacherId && await teacherExistsViaApi(page, appOrigin, teacherId, apiUrl)) {
		return teacherId;
	}

	const schoolId = await resolveSchoolId(page, appOrigin, apiUrl);
	if (!schoolId) {
		return null;
	}

	const listResponse = await apiFetch(page, appOrigin, '/core/entities/teachers/list', {
		method: 'POST',
		data: { schoolId, $limit: 20, $offset: 0 },
	}, apiUrl);
	if (listResponse.ok()) {
		const body = await readApiBody(listResponse) as { items?: Array<{ id?: string }> } | Array<{ id?: string }>;
		const existingId = parseEntityList(body)[0]?.id;
		if (typeof existingId === 'string') {
			return existingId;
		}
	}

	return createTeacherForFamilyFeedback(page, appOrigin, apiUrl);
}

async function listSubjectTeacherAssignments(
	page: Page,
	appOrigin: string,
	academicYearId: string,
	apiUrl: string,
): Promise<TeacherAssignmentListItem[]> {
	const response = await apiFetch(page, appOrigin, '/core/entities/teacher-assignments/list', {
		method: 'POST',
		data: { academicYearId, kind: 'subject', status: 'active', $limit: 50, $offset: 0 },
		academicYearId,
	}, apiUrl);
	if (!response.ok()) {
		console.log(
			`family-feedback assignment list failed: status=${response.status()} body=${(await response.text().catch(() => '')).slice(0, 300)}`,
		);
		return [];
	}
	const body = await readApiBody(response) as { items?: TeacherAssignmentListItem[] } | TeacherAssignmentListItem[];
	return parseEntityList(body);
}

async function resolveClassSubjectIdForCampaign(
	page: Page,
	appOrigin: string,
	classGroupId: string,
	preferredId: string | null,
	catalogSubjectId: string | null | undefined,
	apiUrl: string,
): Promise<string | null> {
	const listed = await listClassSubjects(page, appOrigin, classGroupId, apiUrl);
	if (preferredId && listed.some(entry => entry.id === preferredId)) {
		return preferredId;
	}
	const fromList = listed.find(entry => entry.isOffered !== false)?.id ?? listed[0]?.id ?? null;
	if (fromList) {
		return fromList;
	}
	if (preferredId) {
		return preferredId;
	}
	return ensureClassSubjectForClass(page, appOrigin, {
		classGroupId,
		catalogSubjectId,
	}, apiUrl);
}

async function ensureSubjectTeacherAssignmentViaApi(
	page: Page,
	appOrigin: string,
	options: {
		academicYearId: string;
		teacherId: string;
		classSubjectId: string;
		classGroupId: string;
		forceNew?: boolean;
	},
	apiUrl: string,
): Promise<string | null> {
	if (!options.forceNew) {
		const existing = await listSubjectTeacherAssignments(page, appOrigin, options.academicYearId, apiUrl);
		const match = existing.find(entry =>
			entry.id
			&& entry.classSubjectId === options.classSubjectId
			&& entry.teacherId === options.teacherId,
		)
		?? existing.find(entry => entry.id && entry.classSubjectId === options.classSubjectId)
		?? existing.find(entry => entry.id && entry.teacherId === options.teacherId);
		if (match?.id) {
			return match.id;
		}
	}

	const assignmentId = `ta-ff-${Date.now().toString(36)}`;
	const saveResponse = await apiFetch(page, appOrigin, '/core/entities/teacher-assignments/save', {
		method: 'POST',
		data: {
			id: assignmentId,
			teacherId: options.teacherId,
			academicYearId: options.academicYearId,
			kind: 'subject',
			classSubjectId: options.classSubjectId,
			classGroupId: options.classGroupId,
			responsibility: null,
			status: 'active',
		},
		academicYearId: options.academicYearId,
	}, apiUrl);
	if (!saveResponse.ok()) {
		console.log(
			`family-feedback assignment save failed: status=${saveResponse.status()} body=${(await saveResponse.text().catch(() => '')).slice(0, 300)}`,
		);
		return null;
	}
	return assignmentId;
}

/**
 * Provisioned QA [id] family-feedback rows N/A until a campaign exists.
 * Creates an active subject TeacherAssignment when needed, then a draft campaign.
 */
export async function ensureFamilyFeedbackCampaignViaApi(
	page: Page,
	appOrigin: string,
	options: {
		classGroupId?: string | null;
		classSubjectId?: string | null;
		teacherId?: string | null;
		catalogSubjectId?: string | null;
		forceNew?: boolean;
		assignmentOnly?: boolean;
	},
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<string | null> {
	const existing = options.forceNew
		? []
		: await listFamilyFeedbackCampaignIds(page, appOrigin, apiUrl);
	if (existing[0]) {
		return existing[0];
	}

	const classGroupId = options.classGroupId ?? null;
	if (!classGroupId) {
		console.log('family-feedback campaign skipped: no classGroupId');
		return null;
	}

	const classGroup = await getClassGroup(page, appOrigin, classGroupId, apiUrl);
	const academicYearId = classGroup?.academicYearId
		?? await readStoredAcademicYearId(page);
	if (!academicYearId) {
		console.log('family-feedback campaign skipped: class group has no academicYearId');
		return null;
	}

	const classSubjectId = await resolveClassSubjectIdForCampaign(
		page,
		appOrigin,
		classGroupId,
		options.classSubjectId ?? null,
		options.catalogSubjectId,
		apiUrl,
	);
	if (!classSubjectId) {
		console.log('family-feedback campaign skipped: no classSubjectId');
		return null;
	}

	const teacherId = options.forceNew
		? await createTeacherForFamilyFeedback(page, appOrigin, apiUrl)
		: await ensureTeacherForFamilyFeedback(page, appOrigin, options.teacherId, apiUrl);
	if (!teacherId) {
		console.log('family-feedback campaign skipped: no teacherId');
		return null;
	}

	const teacherAssignmentId = await ensureSubjectTeacherAssignmentViaApi(page, appOrigin, {
		academicYearId,
		teacherId,
		classSubjectId,
		classGroupId,
		forceNew: options.forceNew,
	}, apiUrl);
	if (!teacherAssignmentId) {
		return null;
	}
	if (options.assignmentOnly) {
		return teacherAssignmentId;
	}

	const academicPeriodId = await resolvePeriodIdForYear(page, appOrigin, academicYearId, apiUrl)
		?? await resolveFirstPeriodId(page, appOrigin, apiUrl);
	if (!academicPeriodId) {
		console.log('family-feedback campaign skipped: no academicPeriodId');
		return null;
	}

	const campaignId = `ff-e2e-${Date.now().toString(36)}`;
	const opensAt = new Date();
	const closesAt = new Date(opensAt.getTime() + 7 * 24 * 60 * 60 * 1000);
	const createResponse = await apiFetch(page, appOrigin, '/core/commands/create-family-feedback-campaign', {
		method: 'POST',
		data: {
			requestId: crypto.randomUUID(),
			id: campaignId,
			academicYearId,
			academicPeriodId,
			teacherAssignmentId,
			opensAt: opensAt.toISOString(),
			closesAt: closesAt.toISOString(),
		},
		academicYearId,
	}, apiUrl);
	if (!createResponse.ok()) {
		console.log(
			`family-feedback create failed: status=${createResponse.status()} body=${(await createResponse.text().catch(() => '')).slice(0, 300)}`,
		);
		return null;
	}

	const body = unwrapEntityBody(await readApiBody(createResponse));
	if (typeof body?.id === 'string' && body.id.length > 0) {
		return body.id;
	}
	return campaignId;
}

export async function publishAcademicPeriodsViaApi(
	page: Page,
	appOrigin: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<void> {
	const schoolId = await resolveSchoolId(page, appOrigin, apiUrl);
	const academicYearId = await readStoredAcademicYearId(page);
	if (!schoolId) {
		return;
	}
	const response = await apiFetch(page, appOrigin, '/core/entities/academic-periods/list', {
		method: 'POST',
		data: { schoolId, ...(academicYearId ? { academicYearId } : {}) },
		academicYearId: academicYearId ?? undefined,
	}, apiUrl);
	if (!response.ok()) {
		console.log(`publish periods list failed: status=${response.status()}`);
		return;
	}
	const periods = parseEntityList(await readApiBody(response) as { items?: Array<{ id?: string; academicYearId?: string; isPublished?: boolean }> });
	for (const period of periods) {
		if (!period.id || period.isPublished) {
			continue;
		}
		if (academicYearId && period.academicYearId && period.academicYearId !== academicYearId) {
			continue;
		}
		const published = await apiFetch(page, appOrigin, '/core/commands/publish-academic-period', {
			method: 'POST',
			data: { academicPeriodId: period.id },
			academicYearId: academicYearId ?? undefined,
		}, apiUrl);
		console.log(`publish period ${period.id}: status=${published.status()}`);
	}
}

export async function ensurePublishedTeacherTimetableSession(
	page: Page,
	appOrigin: string,
	options: {
		classGroupId: string;
		teacherId: string;
		catalogSubjectId?: string | null;
	},
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<string | null> {
	console.log(`teacher timetable publish for ${options.teacherId}`);
	const schoolId = await resolveSchoolId(page, appOrigin, apiUrl);
	if (!schoolId) {
		console.log('teacher timetable session skipped: no school');
		return null;
	}
	const classSubjectId = await ensureClassSubjectForClass(page, appOrigin, {
		classGroupId: options.classGroupId,
		catalogSubjectId: options.catalogSubjectId,
	}, apiUrl);
	if (!classSubjectId) {
		console.log('teacher timetable session skipped: no class subject');
		return null;
	}
	const scheduleDate = new Date().toISOString().slice(0, 10);
	const endDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	const classGroup = await getClassGroup(page, appOrigin, options.classGroupId, apiUrl);
	const academicYearId = (typeof classGroup?.academicYearId === 'string' ? classGroup.academicYearId : null)
		?? await readStoredAcademicYearId(page);
	console.log(`teacher timetable year ${academicYearId ?? '(none)'}`);
	if (!academicYearId) {
		console.log('teacher timetable session skipped: no academic year');
		return null;
	}
	const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
	for (const [index, day] of days.entries()) {
		const saved = await apiFetch(page, appOrigin, '/core/entities/period-definitions/save', {
			method: 'POST',
			data: {
				id: `pd-e2e-${academicYearId.slice(0, 8)}-${day}`,
				schoolId,
				academicYearId,
				label: `Période ${index + 1}`,
				dayOfWeek: day,
				order: index + 1,
				startTime: '08:00',
				endTime: '09:00',
				isBreak: false,
				isTeachingSlot: true,
			},
			academicYearId,
		}, apiUrl);
		if (!saved.ok()) {
			console.log(`period slot ${day} status=${saved.status()} body=${(await saved.text().catch(() => '')).slice(0, 180)}`);
		}
	}
	const classSubjects = await listClassSubjects(page, appOrigin, options.classGroupId, apiUrl);
	const periodsPerWeekByClassSubjectId: Record<string, number> = {
		[classSubjectId]: 2,
	};
	for (const subject of classSubjects) {
		if (subject.isOffered !== false) {
			periodsPerWeekByClassSubjectId[subject.id] = 2;
		}
	}
	const generated = await apiFetch(page, appOrigin, '/core/commands/generate-class-group-timetable', {
		method: 'POST',
		data: {
			classGroupId: options.classGroupId,
			academicYearId,
			startDate: scheduleDate,
			endDate,
			placementParameters: { periodsPerWeekByClassSubjectId },
			options: {
				allowUnassignedTeacherPlacements: true,
				enforceWorkloadFulfillment: false,
			},
		},
		academicYearId,
	}, apiUrl);
	const generatedBody = await generated.text().catch(() => '');
	console.log(`generate timetable status=${generated.status()} body=${generatedBody.slice(0, 400)}`);
	if (!generated.ok()) {
		return null;
	}
	const published = await apiFetch(page, appOrigin, '/core/commands/publish-class-group-timetable', {
		method: 'POST',
		data: {
			classGroupId: options.classGroupId,
			startDate: scheduleDate,
			endDate,
			sessionConflictPolicy: 'skip',
		},
		academicYearId,
	}, apiUrl);
	const publishedBody = await published.text().catch(() => '');
	console.log(`publish timetable status=${published.status()} body=${publishedBody.slice(0, 400)}`);
	if (!published.ok()) {
		return null;
	}
	return classSubjectId;
}

export async function grantFamilyFeedbackModerateViaApi(
	page: Page,
	appOrigin: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<void> {
	const schoolId = await resolveSchoolId(page, appOrigin, apiUrl);
	const academicYearId = await readStoredAcademicYearId(page);
	if (!schoolId || !academicYearId) {
		return;
	}
	const response = await apiFetch(page, appOrigin, '/core/entities/staff-members/list', {
		method: 'POST',
		data: { schoolId, accountKind: 'human' },
		academicYearId,
	}, apiUrl);
	if (!response.ok()) {
		console.log(`family-feedback staff list failed: status=${response.status()}`);
		return;
	}
	const staff = parseEntityList(await readApiBody(response) as {
		items?: Array<{ id?: string; firstName?: string; lastName?: string }>;
	});
	const owner = staff.find(member => `${member.firstName ?? ''} ${member.lastName ?? ''}`.includes('Owner'))
		?? staff[0];
	if (!owner?.id) {
		console.log('family-feedback moderate grant skipped: no staff');
		return;
	}
	const granted = await apiFetch(page, appOrigin, '/core/commands/assign-staff-permission', {
		method: 'POST',
		data: {
			id: `spa-ff-${owner.id}`,
			staffId: owner.id,
			schoolId,
			academicYearId,
			permission: 'FAMILY_FEEDBACK_MODERATE',
			scopes: [{ kind: 'school' }],
			status: 'active',
		},
		academicYearId,
	}, apiUrl);
	console.log(`family-feedback moderate grant ${owner.id}: status=${granted.status()}`);
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === 'object' && !Array.isArray(value)
		? value as Record<string, unknown>
		: null;
}

/** Fill any missing roster scores, then submit the official sheet. */
export async function submitAssessmentMarksViaApi(
	page: Page,
	appOrigin: string,
	assessmentId: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<boolean> {
	const reviewResponse = await apiFetch(page, appOrigin, '/core/queries/get-assessment-marks-review', {
		method: 'POST',
		data: { assessmentId },
	}, apiUrl);
	if (!reviewResponse.ok()) {
		console.log(`marks submit skipped: review ${reviewResponse.status()} ${(await reviewResponse.text()).slice(0, 240)}`);
		return false;
	}
	const review = asRecord(await readApiBody(reviewResponse));
	const assessment = asRecord(review?.assessment);
	const missingStudentIds = Array.isArray(review?.missingStudentIds)
		? review.missingStudentIds.filter((id): id is string => typeof id === 'string')
		: [];
	let revision = typeof assessment?.marksRevision === 'number' ? assessment.marksRevision : null;
	const maxScore = typeof assessment?.maxScore === 'number' ? assessment.maxScore : 20;
	if (revision === null) {
		console.log('marks submit skipped: review has no revision');
		return false;
	}
	if (missingStudentIds.length > 0) {
		const recorded = await apiFetch(page, appOrigin, '/core/commands/record-assessment-results', {
			method: 'POST',
			data: {
				requestId: crypto.randomUUID(),
				assessmentId,
				expectedRevision: revision,
				results: missingStudentIds.map(studentId => ({
					id: `ar-${assessmentId}-${studentId}`,
					studentId,
					score: Math.min(12, maxScore),
					designation: 'scored',
				})),
			},
		}, apiUrl);
		if (!recorded.ok()) {
			console.log(`marks roster fill failed: ${recorded.status()} ${(await recorded.text()).slice(0, 240)}`);
			return false;
		}
		const refreshed = await apiFetch(
			page,
			appOrigin,
			`/core/entities/assessments/${encodeURIComponent(assessmentId)}`,
			{},
			apiUrl,
		);
		const next = unwrapEntityBody(await readApiBody(refreshed));
		revision = typeof next?.marksRevision === 'number' ? next.marksRevision : revision;
	}
	if (assessment?.marksStatus === 'submitted') {
		return assessment.marksStatus === 'submitted';
	}
	const submitted = await apiFetch(page, appOrigin, '/core/commands/submit-assessment-marks', {
		method: 'POST',
		data: {
			requestId: crypto.randomUUID(),
			assessmentId,
			expectedRevision: revision,
		},
	}, apiUrl);
	if (!submitted.ok()) {
		console.log(`marks submit failed: ${submitted.status()} ${(await submitted.text()).slice(0, 240)}`);
		return false;
	}
	return true;
}

/** Request a mark-comment correction and approve it through an independent staff profile. */
export async function approveAssessmentCorrectionViaIndependentStaff(
	page: Page,
	appOrigin: string,
	assessmentId: string,
	classGroupId: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<boolean> {
	const schoolId = await resolveSchoolId(page, appOrigin, apiUrl, { classGroupId });
	const academicYearId = await readStoredAcademicYearId(page);
	if (!schoolId || !academicYearId) {
		console.log('marks approve skipped: missing school or year');
		return false;
	}
	const assessmentResponse = await apiFetch(
		page,
		appOrigin,
		`/core/entities/assessments/${encodeURIComponent(assessmentId)}`,
		{},
		apiUrl,
	);
	if (!assessmentResponse.ok()) {
		console.log(`marks approve skipped: assessment read ${assessmentResponse.status()}`);
		return false;
	}
	const assessment = unwrapEntityBody(await readApiBody(assessmentResponse));
	const marksStatus = assessment?.marksStatus;
	const expectedRevision = assessment?.marksRevision;
	if (marksStatus !== 'submitted' || typeof expectedRevision !== 'number') {
		console.log(`marks approve skipped: status=${String(marksStatus)} revision=${String(expectedRevision)}`);
		return false;
	}

	const detailResponse = await apiFetch(page, appOrigin, '/core/queries/get-assessment-marks-review', { method: 'POST', data: { assessmentId } }, apiUrl);
	const detail = asRecord(await readApiBody(detailResponse));
	const mark = Array.isArray(detail?.results) ? asRecord(detail.results[0]) : null;
	if (!mark)
		throw new Error('Correction journey requires a submitted mark');
	const requested = await apiFetch(page, appOrigin, '/core/commands/request-assessment-marks-correction', {
		method: 'POST',
		data: { requestId: crypto.randomUUID(), assessmentId, expectedRevision, reason: 'Verify original assessment comment', changes: [{ resultId: mark.id, proposed: { score: mark.score ?? null, designation: mark.designation ?? 'scored', notes: 'Original assessment checked' } }] },
	}, apiUrl);
	if (!requested.ok())
		throw new Error(`Correction request failed: ${requested.status()} ${await requested.text()}`);
	const correction = asRecord(await readApiBody(requested));
	if (!correction)
		throw new Error('Missing correction response');

	const email = `e2e-reviewer-${Date.now()}@integration.edaya.test`;
	const password = `E2e!${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
	const staffId = `st-review-${Date.now().toString(36)}`;
	let reviewer: Awaited<ReturnType<typeof signUpAccount>>;
	try {
		reviewer = await signUpAccount(apiUrl, appOrigin, email, password, 'E2E Reviewer');
	}
	catch (error) {
		console.log(`marks reviewer sign-up failed: ${error instanceof Error ? error.message : error}`);
		return false;
	}

	const saved = await apiFetch(page, appOrigin, '/core/entities/staff-members/save', {
		method: 'POST',
		data: {
			id: staffId,
			schoolId,
			firstName: 'E2E',
			lastName: 'Reviewer',
			email,
			isActive: true,
			accountKind: 'human',
		},
		academicYearId,
	}, apiUrl);
	if (!saved.ok()) {
		console.log(`marks reviewer staff save failed: ${saved.status()} ${(await saved.text()).slice(0, 240)}`);
		return false;
	}

	const linked = await apiFetch(page, appOrigin, '/core/commands/link-actor-subject', {
		method: 'POST',
		data: { subjectId: reviewer.subjectId, staffMemberId: staffId },
		academicYearId,
	}, apiUrl);
	if (!linked.ok()) {
		console.log(`marks reviewer link failed: ${linked.status()} ${(await linked.text()).slice(0, 240)}`);
		return false;
	}

	const granted = await apiFetch(page, appOrigin, '/core/commands/assign-staff-permission', {
		method: 'POST',
		data: {
			id: `spa-review-${staffId}`,
			staffId,
			schoolId,
			academicYearId,
			permission: 'GRADE_VALIDATE',
			scopes: [{ kind: 'class_group', classGroupId }],
			status: 'active',
		},
		academicYearId,
	}, apiUrl);
	if (!granted.ok()) {
		console.log(`marks reviewer grant failed: ${granted.status()} ${(await granted.text()).slice(0, 240)}`);
		return false;
	}

	const { response, body } = await reviewer.client.jsonRequest<Record<string, unknown>>(
		'/core/commands/approve-assessment-marks-correction',
		{
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'X-School-Id': schoolId,
			},
			body: JSON.stringify({
				requestId: crypto.randomUUID(),
				correctionId: correction.id,
				expectedVersion: correction.version,
			}),
		},
	);
	if (!response.ok) {
		const detail = body ? JSON.stringify(body) : await response.text();
		console.log(`marks approve failed: ${response.status} ${detail.slice(0, 300)}`);
		return false;
	}
	return true;
}

export async function completeWizardViaApi(
	page: Page,
	appOrigin: string,
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<boolean> {
	const response = await apiFetch(page, appOrigin, '/core/onboarding/complete-wizard', {
		method: 'POST',
		data: {},
	}, apiUrl);
	return response.ok();
}
