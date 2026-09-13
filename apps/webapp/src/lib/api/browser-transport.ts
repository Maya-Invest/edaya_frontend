import type { Transport } from '@maya-invest/edaya-api-client';
import { PUBLIC_API_URL } from '$env/static/public';
import { canonicalHttpOrigin } from '$lib/auth/access-token';
import { bearerFetch } from '$lib/auth/bearer-fetch';
import { authSession } from '$lib/auth/session.svelte';
import { lang } from '$lib/i18n';
import { get } from 'svelte/store';
import { parseApiResponse, resolveApiUrl } from './http';

function applyInteractiveActorHeaders(headers: Headers) {
	if (!authSession.sessionKind) {
		return;
	}
	headers.set('X-Actor-Kind', authSession.sessionKind);
	if (authSession.userId) {
		headers.set('X-Actor-Id', authSession.userId);
	}
	if (authSession.schoolId) {
		headers.set('X-School-Id', authSession.schoolId);
	}
}

function applyCommonHeaders(headers: Headers, options?: { body?: unknown }) {
	headers.set('Accept-Language', get(lang) === 'en' ? 'en-US' : 'fr-FR');
	if (options?.body !== undefined) {
		headers.set('Content-Type', 'application/json');
	}
}

export function createBrowserTransport(getYearId: () => string | undefined): Transport {
	return {
		async request<T>(method: string, path: string, options?: { body?: unknown }): Promise<T> {
			const headers = new Headers({
				Accept: 'application/json',
			});
			applyInteractiveActorHeaders(headers);
			applyCommonHeaders(headers, options);

			const yearId = getYearId();
			if (yearId) {
				headers.set('X-Academic-Year-Id', yearId);
			}

			const base = PUBLIC_API_URL;
			const response = await bearerFetch(resolveApiUrl(base, path), {
				method,
				headers,
				body: options?.body === undefined ? undefined : JSON.stringify(options.body),
			});

			return parseApiResponse<T>(path, response);
		},
	};
}

/** Unauthenticated school API calls (invitation preview). Does not mint an identity JWT. */
export function createPublicBrowserTransport(): Transport {
	const origin = canonicalHttpOrigin(PUBLIC_API_URL.trim());
	return {
		async request<T>(method: string, path: string, options?: { body?: unknown }): Promise<T> {
			const headers = new Headers({
				Accept: 'application/json',
			});
			applyCommonHeaders(headers, options);
			headers.delete('cookie');

			const target = new URL(resolveApiUrl(origin, path), origin);
			if (target.origin !== origin || target.username || target.password) {
				throw new Error('API request cannot be sent to this destination');
			}

			const response = await fetch(target.href, {
				method,
				headers,
				credentials: 'omit',
				body: options?.body === undefined ? undefined : JSON.stringify(options.body),
			});

			return parseApiResponse<T>(path, response);
		},
	};
}
