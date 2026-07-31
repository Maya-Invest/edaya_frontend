import { describe, expect, it } from 'bun:test';
import {
	CATALOG_LIST_PAGE_SIZE,
	listAllEntityPages,
	paginatedList,
} from '$lib/api/entity-list-filters';

describe('listAllEntityPages', () => {
	it('concatenates pages until a short page and stops', async () => {
		const pageSize = 500;
		const firstPage = Array.from({ length: pageSize }, (_, index) => ({ id: `a-${index}` }));
		const secondPage = Array.from({ length: 20 }, (_, index) => ({ id: `b-${index}` }));
		const calls: Array<{ $limit?: unknown; $offset?: unknown }> = [];

		const rows = await listAllEntityPages(
			async (query) => {
				calls.push({ $limit: query.$limit, $offset: query.$offset });
				const offset = typeof query.$offset === 'number' ? query.$offset : 0;
				if (offset === 0) {
					return firstPage;
				}
				if (offset === pageSize) {
					return secondPage;
				}
				return [];
			},
			{ pageSize },
		);

		expect(rows).toHaveLength(520);
		expect(rows[0]?.id).toBe('a-0');
		expect(rows[519]?.id).toBe('b-19');
		expect(calls).toEqual([
			{ $limit: pageSize, $offset: 0 },
			{ $limit: pageSize, $offset: pageSize },
		]);
	});

	it('defaults to CATALOG_LIST_PAGE_SIZE and stops on an empty first page', async () => {
		const calls: number[] = [];
		const rows = await listAllEntityPages(async (query) => {
			calls.push(typeof query.$limit === 'number' ? query.$limit : -1);
			return [];
		});

		expect(rows).toEqual([]);
		expect(calls).toEqual([CATALOG_LIST_PAGE_SIZE]);
	});

	it('merges baseQuery filters into each page request', async () => {
		const seen = await listAllEntityPages(
			async query => [{ id: String(query.schoolId), limit: query.$limit, offset: query.$offset }],
			{
				baseQuery: { schoolId: 'school-1' },
				pageSize: 10,
			},
		);

		expect(seen).toEqual([
			{ id: 'school-1', limit: 10, offset: 0 },
		]);
		expect(paginatedList({ schoolId: 'school-1' }, { limit: 10, offset: 0 })).toMatchObject({
			schoolId: 'school-1',
			$limit: 10,
			$offset: 0,
		});
	});
});
