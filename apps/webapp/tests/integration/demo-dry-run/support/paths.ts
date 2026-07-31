import path from 'node:path';

export const DEMO_DRY_RUN_OUT_DIR = path.join(
	import.meta.dirname,
	'../../../../.demo-dry-run',
);

export const DEMO_WEBAPP_BASE = process.env.WEBAPP_URL ?? 'http://localhost:5173';

/** `staging` (default) uses demo picker; `production` uses email/password login. */
export function integrationUsesDemoLogin(): boolean {
	return process.env.INTEGRATION_TARGET !== 'production';
}

export function webappReadinessPath(): string {
	return process.env.WEBAPP_READINESS_PATH
		?? (integrationUsesDemoLogin() ? '/login/demo' : '/login');
}

/** Decode percent-encoding in URL path segments (e.g. colons in timetable session ids). */
export function normalizeIntegrationPathname(pathname: string): string {
	try {
		return pathname
			.split('/')
			.map(segment => (segment ? decodeURIComponent(segment) : segment))
			.join('/');
	}
	catch {
		return pathname;
	}
}

export function pathMatchesPrefix(pathname: string, prefix: string): boolean {
	return normalizeIntegrationPathname(pathname).startsWith(normalizeIntegrationPathname(prefix));
}

const SCHOOL_DRAWER_PREFIXES = [
	'/school/students/',
	'/school/teachers/',
	'/school/staff/',
	'/school/activities/',
] as const;

const CONFIG_DRAWER_PREFIXES = [
	'/configuration/classes/',
	'/configuration/subjects/',
] as const;

export function schoolStudentPath(id: string, tab = 'profile'): string {
	return `/school/students/${id}/${tab}`;
}

export function schoolTeacherPath(id: string, tab = 'profile'): string {
	return `/school/teachers/${id}/${tab}`;
}

export function schoolStaffPath(id: string, tab = 'profile'): string {
	return `/school/staff/${id}/${tab}`;
}

export function schoolActivityPath(id: string, tab = 'profile'): string {
	return `/school/activities/${id}/${tab}`;
}

export function schoolGuardianPath(id: string): string {
	return `/school/guardians/${id}`;
}

export function financeBillingPath(id: string): string {
	return `/finance/billing/${id}`;
}

export function configClassGroupPath(id: string, tab: 'profile' | 'assignments' = 'profile'): string {
	return `/configuration/classes/${id}/${tab}`;
}

export function configSubjectPath(id: string, tab: 'progression' | 'logbook' = 'progression'): string {
	return `/configuration/subjects/${id}/${tab}`;
}

export function classStudentsPath(classId: string, studentId: string, tab = 'profile'): string {
	return `/classes/${classId}/students/${studentId}/${tab}`;
}

export function classTeachingDrawerPath(classId: string, subjectId: string): string {
	return `/classes/${classId}/teaching/${subjectId}`;
}

export function classTeachingPath(
	classId: string,
	subjectId: string,
	tab: 'progression' | 'logbook' = 'progression',
): string {
	return `${classTeachingDrawerPath(classId, subjectId)}/${tab}`;
}

export function classEvaluationsDrawerPath(classId: string, evaluationId: string): string {
	return `/classes/${classId}/evaluations/${evaluationId}`;
}

export function classEvaluationsPath(
	classId: string,
	evaluationId: string,
	tab: 'details' | 'grading' = 'details',
): string {
	return `${classEvaluationsDrawerPath(classId, evaluationId)}/${tab}`;
}

export function classTimetableDrawerPath(classId: string, sessionId: string): string {
	return `/classes/${classId}/timetable/${sessionId}`;
}

export function classTimetablePath(
	classId: string,
	sessionId: string,
	tab: 'details' | 'attendance' | 'logbook' = 'details',
): string {
	return `${classTimetableDrawerPath(classId, sessionId)}/${tab}`;
}

function tabFromSchoolDrawerPath(pathname: string, prefix: string): string | null {
	if (!pathname.startsWith(prefix)) {
		return null;
	}
	const segments = pathname.slice(prefix.length).split('/').filter(Boolean);
	if (segments.length === 0) {
		return null;
	}
	return segments[1] ?? 'profile';
}

export function drawerTabFromPathname(pathname: string): string | null {
	for (const prefix of SCHOOL_DRAWER_PREFIXES) {
		const tab = tabFromSchoolDrawerPath(pathname, prefix);
		if (tab !== null) {
			return tab;
		}
	}

	for (const prefix of CONFIG_DRAWER_PREFIXES) {
		const tab = tabFromSchoolDrawerPath(pathname, prefix);
		if (tab !== null) {
			return tab;
		}
	}

	const classStudentMatch = pathname.match(/^\/classes\/[^/]+\/students\/[^/]+\/([^/]+)/);
	if (classStudentMatch) {
		return classStudentMatch[1] ?? null;
	}

	const classDrawerMatch = pathname.match(
		/^\/classes\/[^/]+\/(?:teaching|evaluations|timetable)\/[^/]+\/([^/]+)/,
	);
	if (classDrawerMatch) {
		return classDrawerMatch[1] ?? null;
	}

	return null;
}
