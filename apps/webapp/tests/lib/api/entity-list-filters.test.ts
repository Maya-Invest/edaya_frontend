import { describe, expect, it } from 'bun:test';
import {
	CATALOG_LIST_PAGE_SIZE,
	DEFAULT_LIST_PAGE_SIZE,
	chunkIds,
	listAllEntityPages,
	listAllEntityPagesByIds,
	listAllEntityPagesForIdFilters,
	listCompleteCollection,
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

	it('pages 49, 50, and 51 rows at the default list size instead of raising the limit', async () => {
		for (const total of [49, 50, 51]) {
			const calls: Array<{ $limit?: unknown; $offset?: unknown }> = [];
			const rows = await listAllEntityPages(
				async (query) => {
					calls.push({ $limit: query.$limit, $offset: query.$offset });
					const offset = typeof query.$offset === 'number' ? query.$offset : 0;
					const remaining = Math.max(0, total - offset);
					return Array.from(
						{ length: Math.min(DEFAULT_LIST_PAGE_SIZE, remaining) },
						(_, index) => ({ id: `row-${offset + index}` }),
					);
				},
				{ pageSize: DEFAULT_LIST_PAGE_SIZE },
			);

			expect(rows).toHaveLength(total);
			expect(calls.every(call => call.$limit === DEFAULT_LIST_PAGE_SIZE)).toBe(true);
			expect(calls.map(call => call.$offset)).toEqual(
				total >= DEFAULT_LIST_PAGE_SIZE ? [0, DEFAULT_LIST_PAGE_SIZE] : [0],
			);
		}
	});

	it('exposes listCompleteCollection as the catalog alias', async () => {
		expect(listCompleteCollection).toBe(listAllEntityPages);
	});
});

describe('listAllEntityPagesByIds', () => {
	it('chunks $in batches and pages each batch to completion', async () => {
		const ids = Array.from({ length: 51 }, (_, index) => `id-${index}`);
		const calls: Array<{ $in?: unknown; $limit?: unknown; $offset?: unknown }> = [];

		const rows = await listAllEntityPagesByIds(
			async (query) => {
				const filter = query.id as { $in?: string[] };
				calls.push({
					$in: filter.$in,
					$limit: query.$limit,
					$offset: query.$offset,
				});
				const offset = typeof query.$offset === 'number' ? query.$offset : 0;
				if (offset > 0) {
					return [];
				}
				return (filter.$in ?? []).map(id => ({ id }));
			},
			ids,
			{ pageSize: DEFAULT_LIST_PAGE_SIZE, batchSize: DEFAULT_LIST_PAGE_SIZE },
		);

		expect(rows).toHaveLength(51);
		expect(calls).toHaveLength(3);
		expect(calls.filter(call => (call.$in as string[]).length === 50)).toHaveLength(2);
		expect(calls.filter(call => (call.$in as string[]).length === 1)).toHaveLength(1);
		expect(calls.every(call => call.$limit === DEFAULT_LIST_PAGE_SIZE)).toBe(true);
		expect(calls[0]?.$limit).toBe(DEFAULT_LIST_PAGE_SIZE);
	});

	it('pages dual $in filters for assessment results across two full classes', async () => {
		const assessmentIds = ['a-1', 'a-2'];
		const studentIds = Array.from({ length: 30 }, (_, index) => `stu-${index}`);
		const calls: Array<{ $limit?: unknown; $offset?: unknown }> = [];

		const rows = await listAllEntityPagesForIdFilters(
			async (query) => {
				calls.push({ $limit: query.$limit, $offset: query.$offset });
				const assessments = (query.assessmentId as { $in?: string[] }).$in ?? [];
				const students = (query.studentId as { $in?: string[] }).$in ?? [];
				const offset = typeof query.$offset === 'number' ? query.$offset : 0;
				const all = assessments.flatMap(assessmentId =>
					students.map(studentId => ({ id: `${assessmentId}:${studentId}` })),
				);
				return all.slice(offset, offset + DEFAULT_LIST_PAGE_SIZE);
			},
			[
				{ field: 'assessmentId', ids: assessmentIds },
				{ field: 'studentId', ids: studentIds },
			],
			{ pageSize: DEFAULT_LIST_PAGE_SIZE },
		);

		expect(rows).toHaveLength(60);
		expect(calls).toEqual([
			{ $limit: DEFAULT_LIST_PAGE_SIZE, $offset: 0 },
			{ $limit: DEFAULT_LIST_PAGE_SIZE, $offset: DEFAULT_LIST_PAGE_SIZE },
		]);
	});

	it('returns no rows for an empty id list', async () => {
		expect(chunkIds([])).toEqual([]);
		expect(await listAllEntityPagesByIds(async () => [{ id: 'x' }], [])).toEqual([]);
	});
});
