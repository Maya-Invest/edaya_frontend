import { ApiError } from '@maya-invest/edaya-api-client';
import { plugin } from 'bun';
import { expect, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'student-history-runes', setup(build) {
	build.onLoad({ filter: /student-history-state\.svelte\.ts$/ }, async ({ path }) => ({
		contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(path).text()), { filename: path, generate: 'client' }).js.code,
		loader: 'js',
	}));
} });
const { StudentHistoryState } = await import('../../src/routes/(app)/school/students/lib/student-history-state.svelte');
const url = new URL('http://localhost/school/students/pupil/grades?subject=Math');
const page = { items: [{ id: 'first' }], nextCursor: 'page-two' as string | null, total: 3 };

test('pupil history preserves rows on a transient continuation and clears them when access is revoked', async () => {
	const calls: (string | undefined)[] = [];
	let failure = 0;
	const tab = new StudentHistoryState(async (selection, cursor) => {
		expect(selection).toEqual({ studentId: 'pupil', subject: 'Math' });
		calls.push(cursor);
		if (failure)
			throw new ApiError(failure, {});
		return cursor ? { ...page, items: [{ id: 'first' }, { id: 'second' }], nextCursor: 'three' } : page;
	}, value => value.searchParams.get('subject') ?? undefined);
	expect((await tab.query()(url)).status).toBe('ready');
	failure = 503;
	await tab.loadMore();
	expect(tab.page?.items).toEqual(page.items);
	expect(tab.moreError).toBe('error');
	failure = 0;
	await tab.loadMore();
	expect(tab.page?.items.map(r => r.id)).toEqual(['first', 'second']);
	failure = 403;
	await tab.loadMore();
	expect(tab.page).toBeNull();
	expect(tab.moreError).toBe('denied');
	expect(calls).toEqual([undefined, 'page-two', 'page-two', 'three']);
});

test('navigation drops an old first page and aborts a pending continuation before showing another pupil', async () => {
	const held = Promise.withResolvers<typeof page>();
	const started = Promise.withResolvers<void>();
	let holdFirst = true;
	let continuationSignal: AbortSignal | undefined;
	const continuation = Promise.withResolvers<typeof page>();
	const pageTwoStarted = Promise.withResolvers<void>();
	const tab = new StudentHistoryState(async (selection, cursor, signal) => {
		if (holdFirst && selection.studentId === 'pupil') {
			started.resolve();
			return held.promise;
		}
		if (cursor) {
			continuationSignal = signal;
			pageTwoStarted.resolve();
			return continuation.promise;
		}
		return { ...page, items: [{ id: selection.studentId }] };
	});
	const first = tab.query()(url);
	await started.promise;
	const next = new URL('/classes/class/students/another/grades', url);
	await tab.query()(next);
	held.resolve(page);
	await first;
	expect(tab.page?.items).toEqual([{ id: 'another' }]);
	holdFirst = false;
	const more = tab.loadMore();
	await pageTwoStarted.promise;
	await tab.query()(url);
	expect(continuationSignal?.aborted).toBe(true);
	continuation.resolve({ ...page, items: [{ id: 'obsolete' }] });
	await more;
	expect(tab.page?.items).toEqual([{ id: 'pupil' }]);
});
