import type { Transport } from '@maya-invest/edaya-api-client';
import { PUBLIC_API_URL } from '$env/static/public';
import { resolveApiUrl } from '$lib/api/http';
import { ApiError } from '@maya-invest/edaya-api-client';
/** Account transport never calls the school token manager. */
export const authTransport: Transport = {
	async request<T>(method: string, path: string, options?: { body?: unknown }): Promise<T> {
		const response = await fetch(resolveApiUrl(PUBLIC_API_URL.trim(), path), {
			method,
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
		});
		const body = await response.json();
		if (!response.ok)
			throw new ApiError(response.status, body);
		return body as T;
	},
};
