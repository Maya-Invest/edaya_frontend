/** Local persisted files are served from `/core/files/` and need the staff bearer, not `window.open`. */
export function isAuthenticatedSchoolFileUrl(source: string, apiBase: string): boolean {
	try {
		const api = new URL(apiBase);
		const url = new URL(source, api.origin);
		return url.origin === api.origin && url.pathname.startsWith('/core/files/');
	}
	catch {
		return false;
	}
}
