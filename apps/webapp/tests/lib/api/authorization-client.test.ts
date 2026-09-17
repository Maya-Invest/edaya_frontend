import type { Transport, TransportRequestOptions } from '@maya-invest/edaya-api-client';
import { createSchoolClient } from '@maya-invest/edaya-api-client';
import { describe, expect, it } from 'bun:test';

describe('generated authorization client', () => {
	it('exposes authorization.profiles without actor headers', async () => {
		const calls: Array<{ method: string; path: string }> = [];
		const transport: Transport = {
			async request<T>(method: string, path: string, _options?: TransportRequestOptions): Promise<T> {
				calls.push({ method, path });
				return { profiles: [] } as T;
			},
		};
		const client = createSchoolClient(transport);

		await expect(client.authorization.profiles()).resolves.toEqual({ profiles: [] });
		expect(calls).toEqual([{ method: 'GET', path: '/core/authorization/profiles' }]);
	});
});
