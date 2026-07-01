import type { Transport } from '$api-client';
import { PUBLIC_API_URL } from '$env/static/public';
import { parseApiResponse, resolveApiUrl } from './http';

export function createBrowserTransport(getYearId: () => string | undefined): Transport {
	return {
		async request<T>(method: string, path: string, options?: { body?: unknown }): Promise<T> {
			const headers = new Headers({ Accept: 'application/json' });
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
