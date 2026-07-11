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

const PATH_TAB_ROUTE_PREFIXES = [
	'/school/students/',
	'/school/teachers/',
	'/school/staff/',
	'/school/activities/',
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

export function drawerTabFromPathname(pathname: string): string | null {
	for (const prefix of PATH_TAB_ROUTE_PREFIXES) {
		if (!pathname.startsWith(prefix)) {
			continue;
		}
		const segments = pathname.slice(prefix.length).split('/').filter(Boolean);
		if (segments.length === 0) {
			return null;
		}
		return segments[1] ?? 'profile';
	}
	return null;
}
