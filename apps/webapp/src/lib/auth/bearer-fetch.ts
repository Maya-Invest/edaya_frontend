import { PUBLIC_API_URL } from '$env/static/public';
import { resolveApiUrl } from '$lib/api/http';
import { ApiError } from '@maya-invest/edaya-api-client';
import { createAccessTokenManager, createBearerFetch } from './access-token';

export const accessTokens = createAccessTokenManager(async () => {
	const response = await fetch(resolveApiUrl(PUBLIC_API_URL || '', '/auth/edaya/access-token'), {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: '{}',
	});
	if (!response.ok) {
		throw new ApiError(response.status, await response.json());
	}
	return response.json();
});
const send = createBearerFetch(accessTokens);

/** Refuse to attach credentials to any URL outside this API. */
export function bearerFetch(url: string, init?: RequestInit): Promise<Response> {
	const base = new URL(PUBLIC_API_URL || '/', window.location.origin);
	const target = new URL(url, window.location.origin);
	if (target.origin !== base.origin || target.username || target.password) {
		throw new Error('API credentials cannot be sent to this destination');
	}
	return send(target.href, init);
}
