import type { StaffSchoolMembership } from '$lib/auth/types';
import type { Transport } from '@maya-invest/edaya-api-client';
import { PUBLIC_API_URL } from '$env/static/public';
import { bearerFetch } from '$lib/auth/bearer-fetch';
import { authSession } from '$lib/auth/session.svelte';
import { lang } from '$lib/i18n';
import { get } from 'svelte/store';
import { parseApiResponse, resolveApiUrl } from './http';

export function schoolRequestHeaders(yearId?: string, membership?: StaffSchoolMembership): Headers {
	const headers = new Headers();
	if (yearId)
		headers.set('X-Academic-Year-Id', yearId);
	const kind = membership?.kind ?? authSession.sessionKind;
	if (!kind)
		return headers;
	headers.set('X-Actor-Kind', kind);
	const actorId = membership?.actorId ?? authSession.userId;
	const schoolId = membership?.schoolId ?? authSession.schoolId;
	if (actorId)
		headers.set('X-Actor-Id', actorId);
	if (schoolId)
		headers.set('X-School-Id', schoolId);
	return headers;
}

export function createBrowserTransport(getYearId: () => string | undefined, membership?: StaffSchoolMembership): Transport {
	return {
		async request<T>(method: string, path: string, options?: { body?: unknown }): Promise<T> {
			const headers = schoolRequestHeaders(getYearId(), membership);
			headers.set('Accept', 'application/json');
			headers.set('Accept-Language', get(lang) === 'en' ? 'en-US' : 'fr-FR');
			if (options?.body !== undefined) {
				headers.set('Content-Type', 'application/json');
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
