import { PUBLIC_API_URL } from '$env/static/public';
import { createAuthClient } from '@maya-invest/edaya-api-client';
import { canonicalHttpOrigin, createAccessTokenManager, createBearerFetch } from './access-token';
import { authTransport } from './transport';

const schoolApiOrigin = canonicalHttpOrigin(PUBLIC_API_URL.trim());

const account = createAuthClient(authTransport);
export const accessTokens = createAccessTokenManager(resource => account.accessToken({ resource }));

const send = createBearerFetch(accessTokens, schoolApiOrigin);

/** School API fetch pinned to PUBLIC_API_URL. */
export function bearerFetch(url: string, init?: RequestInit): Promise<Response> {
	return send(url, init);
}

/** Origin-pinned fetch for any first-party API that shares this identity session. */
export function createApiBearerFetch(apiBaseUrl: string) {
	return createBearerFetch(accessTokens, canonicalHttpOrigin(apiBaseUrl));
}
