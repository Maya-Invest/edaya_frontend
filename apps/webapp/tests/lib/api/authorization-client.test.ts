import { describe, expect, it } from 'bun:test';
import { createSchoolClient } from '@maya-invest/edaya-api-client';

describe('generated authorization client', () => {
	it('exposes authorization.profiles without actor headers', async () => {
		const calls: Array<{ method: string; path: string }> = [];
		const client = createSchoolClient({
			request: async (method, path) => {
				calls.push({ method, path });
				return { profiles: [] };
			},
		});

		await expect(client.authorization.profiles()).resolves.toEqual({ profiles: [] });
		expect(calls).toEqual([{ method: 'GET', path: '/core/authorization/profiles' }]);
	});
});
