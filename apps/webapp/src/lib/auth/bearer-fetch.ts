import { PUBLIC_API_URL, PUBLIC_AUTH_URL } from '$env/static/public';
import { resolveApiUrl } from '$lib/api/http';
import { ApiError } from '@maya-invest/edaya-api-client';
import { canonicalHttpOrigin, createAccessTokenManager, createBearerFetch } from './access-token';

const authBaseUrl = PUBLIC_AUTH_URL.trim();
if (!authBaseUrl) {
	throw new Error('PUBLIC_AUTH_URL is required');
}

const schoolApiOrigin = canonicalHttpOrigin(PUBLIC_API_URL.trim());

export const accessTokens = createAccessTokenManager(async (resource) => {
	const response = await fetch(resolveApiUrl(authBaseUrl, '/auth/edaya/access-token'), {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ resource }),
	});
	if (!response.ok) {
		throw new ApiError(response.status, await response.json());
	}
	return response.json();
});

const send = createBearerFetch(accessTokens, schoolApiOrigin);

/** School API fetch pinned to PUBLIC_API_URL. */
export function bearerFetch(url: string, init?: RequestInit): Promise<Response> {
	return send(url, init);
}

/** Origin-pinned fetch for any first-party API that shares this identity session. */
export function createApiBearerFetch(apiBaseUrl: string) {
	return createBearerFetch(accessTokens, canonicalHttpOrigin(apiBaseUrl));
}
