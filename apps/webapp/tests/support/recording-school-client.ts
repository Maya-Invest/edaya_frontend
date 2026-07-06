import type { Transport, TransportRequestOptions } from '$api-client';
import type { components } from '$lib/api/schema';
import { createSchoolClient } from '$api-client';

export interface RecordedRequest {
	method: string;
	path: string;
	body?: unknown;
}

export function createRecordingSchoolClient(responses: unknown[]) {
	const requests: RecordedRequest[] = [];
	const transport: Transport = {
		async request<T>(method: string, path: string, options?: TransportRequestOptions): Promise<T> {
			requests.push({
				method,
				path,
				body: options?.body,
			});
			const next = responses.shift();
			if (next === undefined) {
				throw new Error(`No mock response for ${method} ${path}`);
			}
			return next as T;
		},
	};
	const client = createSchoolClient<components['schemas']>(transport);
	return { client, requests };
}

export function entityListRequests(requests: readonly RecordedRequest[], publicName: string) {
	return requests.filter(request =>
		request.method === 'POST' && request.path === `/core/entities/${publicName}/list`);
}

export function entityCountRequests(requests: readonly RecordedRequest[], publicName: string) {
	return requests.filter(request =>
		request.method === 'POST' && request.path === `/core/entities/${publicName}/count`);
}

export function queryRequests(requests: readonly RecordedRequest[], publicName: string) {
	return requests.filter(request =>
		request.method === 'POST' && request.path === `/core/queries/${publicName}`);
}
