/**
 * Authenticated API helpers for the owner UI journey (Playwright request context).
 * Used as fallbacks when drawer/modal UI flows are flaky.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from 'playwright';

const DEFAULT_API_URL = 'http://localhost:9999';
const PROVISIONED_FIXTURE_PATH = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'../../../.integration-run/fixture.json',
);

async function readProvisionedFixtureSchoolId(): Promise<string | null> {
	if (process.env['INTEGRATION_PROVISIONED'] !== '1') {
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

function isLikelyApiResponse(response: import('playwright').APIResponse): boolean {
	const contentType = response.headers()['content-type'] ?? '';
	if (contentType.includes('text/html')) {
		return false;
	}
	return contentType.includes('json') || response.ok();
}

async function apiFetch(
	page: Page,
	appOrigin: string,
	path: string,
	init: { method?: string; data?: unknown } = {},
	apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
): Promise<import('playwright').APIResponse> {
	const appBase = appOrigin.replace(/\/+$/, '');
	const apiBase = apiUrl.replace(/\/+$/, '');
	const schoolId = await readProvisionedFixtureSchoolId();
	const headers: Record<string, string> = {
		'content-type': 'application/json',
		accept: 'application/json',
	};
	if (schoolId) {
		headers['X-School-Id'] = schoolId;
	}

	// Local Vite proxies /core on the webapp origin. CI Wrangler SPA does not —
	// POST /core there is 405/HTML, so also try API_URL (same cookie jar as the baked PUBLIC_API_URL).
	const bases = [appBase];
	if (apiBase && apiBase !== appBase) {
		bases.push(apiBase);
	}

	let last: import('playwright').APIResponse | undefined;
	for (const base of bases) {
		const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
		last = (init.method ?? 'GET') === 'POST'
			? await page.request.post(url, { headers, data: init.data ?? {} })
			: await page.request.get(url, { headers });
		if (isLikelyApiResponse(last)) {
			return last;
		}
		integrationDebug(`apiFetch skip ${last.status()} ${url}`);
	}
	return last!;
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
	const fromSession = await page.evaluate(() => sessionStorage.getItem('edaya:periodId')).catch(() => null);
	if (fromSession) {
		return fromSession;
	}

	const schoolId = await resolveSchoolId(page, appOrigin, apiUrl);
	if (!schoolId) {
		return null;
	}

	const response = await apiFetch(page, appOrigin, '/core/entities/academic-periods/list', {
		method: 'POST',
		data: { schoolId },
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
	if (process.env['INTEGRATION_DEBUG'] === '1') {
		console.log('[journey-api]', ...args);
	}
}

async function readApiBody(response: import('playwright').APIResponse): Promise<unknown> {
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
): Promise<string | null> {
	const listed = await listLessonSessionIdsForClass(page, appOrigin, classGroupId, apiUrl);
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
): Promise<string[]> {
	const response = await apiFetch(page, appOrigin, '/core/entities/lesson-sessions/list', {
		method: 'POST',
		data: { classGroupId },
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
	const body = await readApiBody(response) as {
		academicYearId?: string;
		homeroomStaffId?: string | null;
		schoolId?: string;
	} | null;
	return body;
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
	);
	if (existingSession) {
		return { sessionId: existingSession, scheduleDate };
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
