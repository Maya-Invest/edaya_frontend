/** School API origin for `/core` and `/public`. */
export const DEFAULT_API_URL = 'http://localhost:9999';
/** Central Identity origin for `/auth/*` and seed email verification. */
export const DEFAULT_AUTH_URL = 'http://localhost:9900';

export function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.replace(/\/+$/, '');
}

export function resolveApiUrl(apiUrl?: string): string {
	return normalizeBaseUrl(apiUrl ?? process.env.API_URL ?? DEFAULT_API_URL);
}

export function resolveAuthUrl(authUrl?: string): string {
	return normalizeBaseUrl(
		authUrl
			?? process.env.AUTH_URL
			?? process.env.PUBLIC_AUTH_URL
			?? DEFAULT_AUTH_URL,
	);
}

export function isIdentityPath(path: string): boolean {
	const normalized = path.startsWith('/') ? path : `/${path}`;
	return normalized.startsWith('/auth/') || normalized === '/dev/seed/mark-email-verified';
}
