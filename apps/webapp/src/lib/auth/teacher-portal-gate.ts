/** Query flag shown on /login after a linked teacher signs in on the staff webapp. */
export const TEACHER_PORTAL_GATE_PARAM = 'portal';
export const TEACHER_PORTAL_GATE_VALUE = 'teacher';

export const TEACHER_PORTAL_GATE_BANNER_TEST_ID = 'teacher-portal-gate-banner';

/** Login path with teacher portal gate banner (no $app import — safe for Playwright harness). */
export function teacherPortalLoginPath(): string {
	return `/login?${TEACHER_PORTAL_GATE_PARAM}=${TEACHER_PORTAL_GATE_VALUE}`;
}

export function isTeacherPortalGateUrl(url: string | URL): boolean {
	const parsed = typeof url === 'string' ? new URL(url, 'http://localhost') : url;
	return parsed.searchParams.get(TEACHER_PORTAL_GATE_PARAM) === TEACHER_PORTAL_GATE_VALUE;
}
