import { plugin } from 'bun';
import { afterEach, describe, expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'timetable-runes', setup(build) {
	build.onLoad({ filter: /timetable-planning-page\.svelte\.ts$/ }, async ({ path }) => ({ contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(path).text()), { filename: path, generate: 'client' }).js.code, loader: 'js' }));
} });
const versions: string[] = [];
const errors: string[] = [];
const requests: Array<{ academicYearId: string; classGroupIds?: string[] }> = [];
let requestError: unknown = null;
let refreshError = false;
let changeYear = false;
const academicData = { yearId: 'year', schools: [{ id: 'school' }], gradeLevels: [{ id: 'g', order: 1 }], classes: ['a', 'b', 'c'].map(id => ({ id, name: id, gradeLevelId: 'g', academicYearId: 'year' })) };
mock.module('$lib/academic/context.svelte', () => ({ academicContext: academicData }));
mock.module('$lib/api/mutations/timetable-generation.mutations', () => ({ generateSchoolTimetable: async (input: { academicYearId: string; classGroupIds?: string[] }) => {
	requests.push(input);
	if (requestError)
		throw requestError;
	if (changeYear)
		academicData.yearId = 'other';
	return { academicYearId: input.academicYearId, classGroups: input.classGroupIds?.map(classGroupId => ({ classGroupId, sessions: [], placements: [], unmetWorkloads: [] })) ?? [], skippedClassGroupIds: [] };
} }));
mock.module('$lib/entity-versions.svelte', () => ({ entityVersions: { bump: (key: string) => versions.push(key) } }));
mock.module('$lib/i18n', () => ({ lang: { subscribe: (fn: (value: string) => void) => {
	fn('en');
	return () => {};
} }, t: { subscribe: (fn: (value: unknown) => void) => {
	fn((key: string) => key);
	return () => {};
} } }));
mock.module('$lib/toast.svelte', () => ({ toast: { success: () => {}, error: (message: string) => errors.push(message) } }));
mock.module('$lib/navigation/route-version-snapshot', () => ({ RouteVersionSnapshot: class {
	markLoaded() {}
	hasLoaded() { return false; }
	isStale() { return false; }
} }));
const { TimetablePlanningPageState } = await import('../../src/routes/(app)/configuration/tools/timetable-planning-page.svelte');
const { ApiError } = await import('@maya-invest/edaya-api-client');
const input = { classGroupIds: ['c', 'a', 'c'], startDate: '2026-10-05', endDate: '2026-10-09' };
function state() {
	const page = new TimetablePlanningPageState();
	page.load = async () => {
		if (refreshError)
			throw new Error('Refresh failed');
	};
	return page;
}
afterEach(() => {
	versions.length = 0;
	errors.length = 0;
	requests.length = 0;
	requestError = null;
	refreshError = false;
	changeYear = false;
	academicData.yearId = 'year';
});
describe('atomic timetable generation', () => {
	test('sends the entire selected set once and invalidates planning', async () => {
		const page = state();
		expect((await page.generate(input)).ok).toBe(true);
		expect(requests).toHaveLength(1);
		expect(requests[0]?.classGroupIds).toEqual(['a', 'c']);
		expect(versions).toEqual(['planning']);
		expect(page.generationResult?.classGroups.map(row => row.classGroupId)).toEqual(['a', 'c']);
		expect(page.busy).toBe(false);
	});
	test('refresh failure retains the confirmed result without regenerating', async () => {
		refreshError = true;
		const page = state();
		expect((await page.generate(input)).ok).toBe(true);
		expect(requests).toHaveLength(1);
		expect(errors).toEqual(['mutation.savedRefreshFailed']);
		expect(versions).toEqual(['planning']);
	});
	test('conflicts do not retry, invalidate, or display partial success', async () => {
		requestError = new ApiError(409, { code: 'SCHEDULE_CONFLICT', message: 'A lesson overlaps' });
		const page = state();
		expect(await page.generate(input)).toMatchObject({ ok: false, error: { code: 'SCHEDULE_CONFLICT' } });
		expect(requests).toHaveLength(1);
		expect(versions).toEqual([]);
		expect(page.generationResult).toBeNull();
		expect(page.busy).toBe(false);
	});
	test('rejects empty and stale selections before making a request', async () => {
		for (const classGroupIds of [[], ['other-year']])
			expect(await state().generate({ ...input, classGroupIds })).toMatchObject({ ok: false });
		expect(requests).toEqual([]);
	});
	test('does not attach results to a newly selected academic year', async () => {
		changeYear = true;
		const page = state();
		await page.generate(input);
		expect(requests[0]?.academicYearId).toBe('year');
		expect(page.generationResult).toBeNull();
	});
});
