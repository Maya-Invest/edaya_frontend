import type { Transport } from '@maya-invest/edaya-api-client';
import { PUBLIC_API_URL } from '$env/static/public';
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

export function createBrowserTransport(getYearId: () => string | undefined): Transport {
	return {
		async request<T>(method: string, path: string, options?: { body?: unknown }): Promise<T> {
			const headers = new Headers({
				Accept: 'application/json',
			});
			applyInteractiveActorHeaders(headers);
			headers.set('Accept-Language', get(lang) === 'en' ? 'en-US' : 'fr-FR');
			if (options?.body !== undefined) {
				headers.set('Content-Type', 'application/json');
			}

			const yearId = getYearId();
			if (yearId) {
				headers.set('X-Academic-Year-Id', yearId);
			}

			const base = PUBLIC_API_URL || '';
			const response = await bearerFetch(resolveApiUrl(base, path), {
				method,
				headers,
				body: options?.body === undefined ? undefined : JSON.stringify(options.body),
			});

			return parseApiResponse<T>(path, response);
		},
	};
}
