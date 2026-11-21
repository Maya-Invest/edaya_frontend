import { ApiError } from '@maya-invest/edaya-api-client';
import { plugin } from 'bun';
import { expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'campaign-history-runes', setup(build) {
	build.onLoad({ filter: /scoped-cursor-list\.svelte\.ts$/ }, async ({ path }) => ({
		contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(path).text()), { filename: path, generate: 'client' }).js.code,
		loader: 'js',
	}));
} });
type Page = { items: { id: string }[]; total: number; nextCursor: string | null };
const getStaffFeedbackHistory = mock(async (_input: { q?: string; cursor?: string }, _options: { signal?: AbortSignal }): Promise<Page> =>
	({ items: [{ id: 'first' }], total: 2, nextCursor: 'page-two' }));
mock.module('$lib/queries/client', () => ({ queryClient: () => ({ queries: { getStaffFeedbackHistory } }) }));
const { FamilyFeedbackHistory } = await import('../../src/routes/(app)/school/family-feedback/lib/family-feedback-history.svelte');

test('campaign history retries the same cursor and clears the list after a revoked grant', async () => {
	const clear = mock(() => {});
	const history = new FamilyFeedbackHistory(() => ({ q: '', status: 'all', lang: 'en', scope: 'staff', academicYearId: 'year' }), clear);
	await history.refresh();
	getStaffFeedbackHistory.mockRejectedValueOnce(new ApiError(503, {}));
	await history.more();
	expect(history.failed).toBe('more');
	expect(history.current?.items.map(row => row.id)).toEqual(['first']);
	getStaffFeedbackHistory.mockRejectedValueOnce(new ApiError(403, {}));
	await history.more();
	expect(history.denied).toBe(true);
	expect(history.current).toBeUndefined();
	expect(clear).toHaveBeenCalledTimes(1);
	expect(getStaffFeedbackHistory.mock.calls.slice(-2).map(([input]) => input.cursor)).toEqual(['page-two', 'page-two']);
});

test('a delayed campaign continuation cannot append rows to a different search', async () => {
	let q = '';
	const history = new FamilyFeedbackHistory(() => ({ q, status: 'all', lang: 'en', scope: 'staff', academicYearId: 'year' }), () => {});
	await history.refresh();
	const held = Promise.withResolvers<Page>();
	getStaffFeedbackHistory.mockImplementationOnce(async () => held.promise);
	const continuation = history.more();
	const signal = getStaffFeedbackHistory.mock.lastCall![1].signal;
	q = 'Topic 060';
	getStaffFeedbackHistory.mockResolvedValueOnce({ items: [{ id: 'campaign-60' }], total: 1, nextCursor: null });
	await history.refresh();
	expect(getStaffFeedbackHistory.mock.lastCall![0]).toMatchObject({ academicYearId: 'year', lang: 'en', q });
	expect(signal?.aborted).toBe(true);
	held.resolve({ items: [{ id: 'stale' }], total: 2, nextCursor: null });
	await continuation;
	expect(history.current?.items.map(row => row.id)).toEqual(['campaign-60']);
});
