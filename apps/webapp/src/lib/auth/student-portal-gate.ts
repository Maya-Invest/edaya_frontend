/** Query flag shown on /login after a linked student signs in on the staff webapp. */
export const STUDENT_PORTAL_GATE_PARAM = 'portal';
export const STUDENT_PORTAL_GATE_VALUE = 'student';

export const STUDENT_PORTAL_GATE_BANNER_TEST_ID = 'student-portal-gate-banner';

export function studentPortalLoginPath(): string {
	return `/login?${STUDENT_PORTAL_GATE_PARAM}=${STUDENT_PORTAL_GATE_VALUE}`;
}

export function isStudentPortalGateUrl(url: string | URL): boolean {
	const parsed = typeof url === 'string' ? new URL(url, 'http://localhost') : url;
	return parsed.searchParams.get(STUDENT_PORTAL_GATE_PARAM) === STUDENT_PORTAL_GATE_VALUE;
}
