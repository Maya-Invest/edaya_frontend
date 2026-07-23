import type { Transport } from '@maya-invest/edaya-api-client';
import { PUBLIC_API_URL } from '$env/static/public';
import { authSession } from '$lib/auth/session.svelte';
import { parseApiResponse, resolveApiUrl } from './http';

function applyInteractiveActorHeaders(headers: Headers) {
	if (!authSession.sessionKind) {
		return;
	}
	headers.set('X-Actor-Kind', authSession.sessionKind);
	if (authSession.userId) {
		headers.set('X-Actor-Id', authSession.userId);
	}
}

export function createBrowserTransport(getYearId: () => string | undefined): Transport {
	return {
		async request<T>(method: string, path: string, options?: { body?: unknown }): Promise<T> {
			const headers = new Headers({
				'Accept': 'application/json',
			});
			applyInteractiveActorHeaders(headers);
			if (options?.body !== undefined) {
				headers.set('Content-Type', 'application/json');
			}

			const yearId = getYearId();
			if (yearId) {
				headers.set('X-Academic-Year-Id', yearId);
			}

			const base = PUBLIC_API_URL || '';
			const response = await fetch(resolveApiUrl(base, path), {
				method,
				headers,
				credentials: 'include',
				body: options?.body === undefined ? undefined : JSON.stringify(options.body),
			});

			return parseApiResponse<T>(path, response);
		},
	};
}
