/** Query flag shown on /login after a linked guardian signs in on the staff webapp. */
export const GUARDIAN_PORTAL_GATE_PARAM = 'portal';
export const GUARDIAN_PORTAL_GATE_VALUE = 'guardian';

export const GUARDIAN_PORTAL_GATE_BANNER_TEST_ID = 'guardian-portal-gate-banner';

export function guardianPortalLoginPath(): string {
	return `/login?${GUARDIAN_PORTAL_GATE_PARAM}=${GUARDIAN_PORTAL_GATE_VALUE}`;
}

export function isGuardianPortalGateUrl(url: string | URL): boolean {
	const parsed = typeof url === 'string' ? new URL(url, 'http://localhost') : url;
	return parsed.searchParams.get(GUARDIAN_PORTAL_GATE_PARAM) === GUARDIAN_PORTAL_GATE_VALUE;
}
