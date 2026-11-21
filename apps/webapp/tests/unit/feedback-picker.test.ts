import type { FeedbackOptionsPage, FeedbackPicker } from '../../src/lib/api/family-feedback-types';
import { plugin } from 'bun';
import { expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'feedback-picker-runes', setup(build) {
	build.onLoad({ filter: /feedback-picker\.svelte\.ts$/ }, async ({ path }) => ({
		contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(path).text()), { filename: path, generate: 'client' }).js.code,
		loader: 'js',
	}));
} });
const { FeedbackPickerState } = await import('../../src/routes/(app)/school/family-feedback/lib/feedback-picker.svelte');
const page: FeedbackOptionsPage = { assignments: [{ id: 'a', label: 'First' }], moderators: [], nextAssignment: 'next', nextModerator: 'other' };

test('a superseded search cannot replace the choices for the current query', async () => {
	const firstRead = Promise.withResolvers<void>();
	const secondRead = Promise.withResolvers<void>();
	const oldPage = Promise.withResolvers<FeedbackOptionsPage>();
	const read = mock(async (_picker: FeedbackPicker | 'both', _signal: AbortSignal, q?: string) => {
		if (q === 'old') {
			firstRead.resolve();
			return oldPage.promise;
		}
		secondRead.resolve();
		return { ...page, assignments: [{ id: 'new', label: 'Newest' }], nextAssignment: null };
	});
	const picker = new FeedbackPickerState({ firstOptions: page, optionScope: 'year', readOptions: read, handleOptionsDenial: () => false }, () => 'assignments');
	picker.search('old');
	await firstRead.promise;
	const oldSignal = read.mock.lastCall![1];
	picker.search('  new ');
	expect(oldSignal.aborted).toBe(true);
	await secondRead.promise;
	oldPage.resolve(page);
	await new Promise<void>(resolve => setImmediate(resolve));
	expect(read.mock.calls.map(call => call[2])).toEqual(['old', 'new']);
	expect(picker.items.map(row => row.id)).toEqual(['new']);
	expect(picker.status).toBe('ready');
});

test('independent pickers retry their own cursor and ignore superseded or cancelled results', async () => {
	const held = Promise.withResolvers<FeedbackOptionsPage>();
	const read = mock(async (_picker: FeedbackPicker | 'both', _signal: AbortSignal, _q?: string, _after?: string) => page);
	const source = { firstOptions: page, optionScope: 'year', readOptions: read, handleOptionsDenial: () => false };
	const assignments = new FeedbackPickerState(source, () => 'assignments');
	const moderators = new FeedbackPickerState(source, () => 'moderators');
	read.mockImplementationOnce(async () => held.promise);
	const old = assignments.more();
	const oldSignal = read.mock.lastCall![1];
	await moderators.more();
	expect(oldSignal.aborted).toBe(false);
	read.mockRejectedValueOnce(new Error('temporarily unavailable'));
	await assignments.more();
	expect(oldSignal.aborted).toBe(true);
	expect(assignments.status).toBe('error');
	read.mockResolvedValueOnce({ ...page, assignments: [{ id: 'b', label: 'Second' }], nextAssignment: null });
	await assignments.retry();
	held.resolve(page);
	await old;
	expect(assignments.items.map(row => row.id)).toEqual(['a', 'b']);
	expect(assignments.cursor).toBeNull();
	expect(read.mock.calls.map(([kind, , , cursor]) => [kind, cursor])).toEqual([
		['assignments', 'next'], ['moderators', 'other'], ['assignments', 'next'], ['assignments', 'next'],
	]);
	const pending = Promise.withResolvers<FeedbackOptionsPage>();
	read.mockImplementationOnce(async () => pending.promise);
	const latest = moderators.more();
	moderators.cancel();
	pending.resolve({ ...page, moderators: [{ id: 'obsolete', label: 'Old moderator' }] });
	await latest;
	expect(moderators.items).toEqual([]);
});
