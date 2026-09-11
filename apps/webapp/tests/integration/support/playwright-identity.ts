import type { Page } from 'playwright';
import { resolveAuthUrl } from './integration-hosts';

interface CachedToken {
	value: string;
	expiresAt: number;
	cookie: string;
}

const tokens = new WeakMap<Page, CachedToken>();

export async function identityCookieHeaderFromPage(
	page: Page,
	authUrl = resolveAuthUrl(),
): Promise<string | undefined> {
	const origin = new URL(authUrl).origin;
	const scoped = await page.context().cookies(origin);
	const fromOrigin = scoped.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
	if (fromOrigin.length > 0) {
		return fromOrigin;
	}

	const all = await page.context().cookies();
	const joined = all.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
	return joined.length > 0 ? joined : undefined;
}

/** Exchange Identity cookies for a school Bearer JWT. Do not send those cookies to `/core`. */
export async function schoolBearerFromPage(
	page: Page,
	appOrigin: string,
	authUrl = resolveAuthUrl(),
): Promise<string | undefined> {
	const cookie = (await identityCookieHeaderFromPage(page, authUrl)) ?? '';
	const cached = tokens.get(page);
	if (cached && cached.cookie === cookie && cached.expiresAt > Date.now() + 30_000) {
		return cached.value;
	}
	if (!cookie) {
		return undefined;
	}

	const response = await page.request.post(`${authUrl}/auth/edaya/access-token`, {
		headers: {
			'content-type': 'application/json',
			cookie,
			origin: appOrigin.replace(/\/+$/, ''),
		},
		data: {},
	});
	if (response.status() === 401) {
		tokens.delete(page);
		return undefined;
	}
	if (!response.ok()) {
		throw new Error(`Identity access-token exchange failed: HTTP ${response.status()}`);
	}

	const body = await response.json() as { accessToken?: string; expiresAt?: string };
	if (
		typeof body.accessToken !== 'string'
		|| body.accessToken.length === 0
		|| typeof body.expiresAt !== 'string'
		|| !Number.isFinite(Date.parse(body.expiresAt))
	) {
		throw new Error('Invalid identity access-token response');
	}

	const expiresAt = Date.parse(body.expiresAt);
	tokens.set(page, { value: body.accessToken, expiresAt, cookie });
	return body.accessToken;
}
