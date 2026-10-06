import { readFile } from 'node:fs/promises';
import { plugin } from 'bun';
import { afterEach, describe, expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'tools-timetable-runes', setup(builder) {
	builder.onLoad({ filter: /timetable-planning-page\.svelte\.ts$/ }, async ({ path }) => ({ contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await readFile(path, 'utf8')), { filename: path, generate: 'client' }).js.code, loader: 'js' }));
} });
let requestError: Error | null = null;
let refreshError = false;
let writes = 0;
const published = { classGroupId: 'class', publishedSessionIds: ['session'], skippedSessionIds: [] };
const versions: string[] = [];
const errors: string[] = [];
const academicData = { classes: ['a', 'b', 'c'].map(id => ({ id, name: id, gradeLevelId: 'grade', academicYearId: 'year' })), gradeLevels: [], schools: [{ id: 'school' }], yearId: 'year' };
const generationCalls: string[] = [];
const generationYears: string[] = [];
let changeYearDuringGeneration = false;
let failedClass = '';
mock.module('$lib/academic/context.svelte', () => ({ academicContext: academicData }));
mock.module('$lib/api/mutations/timetable-generation.mutations', () => ({ generateClassTimetable: async (input: { classGroupId: string; academicYearId: string }) => {
	generationCalls.push(input.classGroupId);
	generationYears.push(input.academicYearId);
	if (changeYearDuringGeneration)
		academicData.yearId = 'other-year';
	if (input.classGroupId === failedClass)
		throw new Error('Generation failed');
	return { classGroupId: input.classGroupId, sessions: [], placements: [], unmetWorkloads: [] };
}, publishClassTimetable: async () => {
	writes++;
	if (requestError)
		throw requestError;
	return published;
} }));
mock.module('$lib/api/school-client', () => ({ getBrowserSchoolClient: () => ({ entities: {} }) }));
mock.module('$lib/entity-versions.svelte', () => ({ entityVersions: { bump: (key: string) => versions.push(key) } }));
mock.module('$lib/i18n', () => ({ lang: { subscribe: (fn: (value: string) => void) => {
	fn('fr');
	return () => {};
} }, t: { subscribe: (fn: (value: unknown) => void) => {
	fn((key: string) => key);
	return () => {};
} } }));
mock.module('$lib/toast.svelte', () => ({ toast: { success: () => {}, error: (message: string) => errors.push(message) } }));
mock.module('$lib/navigation/route-version-snapshot', () => ({ RouteVersionSnapshot: class {
	markLoaded() {} hasLoaded() {
		return false;
	}

	isStale() {
		return false;
	}
} }));
const { TimetablePlanningPageState } = await import('../../src/routes/(app)/configuration/tools/timetable-planning-page.svelte');
const { ApiError } = await import('@maya-invest/edaya-api-client');
afterEach(() => {
	requestError = null;
	refreshError = false;
	writes = 0;
	versions.length = 0;
	errors.length = 0;
	generationCalls.length = 0;
	generationYears.length = 0;
	changeYearDuringGeneration = false;
	academicData.yearId = 'year';
	failedClass = '';
});
function state() {
	const page = new TimetablePlanningPageState();
	page.load = async () => {
		if (refreshError)
			throw new Error('Refresh failed');
	};
	return page;
}
describe('timetable publication outcomes', () => {
	test('successful publication invalidates planning and releases busy state', async () => {
		const page = state();
		expect(await page.publish('class', '2026-10-05', '2026-10-09', 'fail')).toEqual(published);
		expect(versions).toEqual(['planning']);
		expect(page.busy).toBe(false);
		expect(writes).toBe(1);
	});
	test('refresh failure retains a confirmed publication without a retry', async () => {
		refreshError = true;
		const page = state();
		expect(await page.publish('class', '2026-10-05', '2026-10-09', 'fail')).toEqual(published);
		expect(writes).toBe(1);
		expect(versions).toEqual(['planning']);
		expect(errors).toEqual(['mutation.savedRefreshFailed']);
	});
	test('a publication conflict does not invalidate or retry', async () => {
		requestError = new ApiError(409, { code: 'TIMETABLE_PUBLISHED_ALREADY_EXISTS' });
		const page = state();
		expect(await page.publish('class', '2026-10-05', '2026-10-09', 'fail')).toBeNull();
		expect(writes).toBe(1);
		expect(versions).toEqual([]);
		expect(page.busy).toBe(false);
		expect(errors).toEqual(['timetable.errorPublishedExists']);
	});
});

describe('selected timetable generation outcomes', () => {
	test('a running selection keeps its academic year and cannot attach results to a newly selected year', async () => {
		changeYearDuringGeneration = true;
		const page = state();
		const result = await page.generate({ classGroupIds: ['a', 'c'], startDate: '2026-10-05', endDate: '2026-10-09' });
		expect(result.ok).toBe(true);
		expect(generationCalls).toEqual(['a', 'c']);
		expect(generationYears).toEqual(['year', 'year']);
		expect(page.generationResult).toBeNull();
		expect(page.activeRange).toBeNull();
	});
	test('only selected current-year classes generate, deduplicated and in order', async () => {
		const page = state();
		const result = await page.generate({ classGroupIds: ['c', 'a', 'c'], startDate: '2026-10-05', endDate: '2026-10-09' });
		expect(result.ok).toBe(true);
		expect(generationCalls).toEqual(['a', 'c']);
		expect(page.generationResult?.classGroups.map(row => row.classGroupId)).toEqual(['a', 'c']);
		expect(page.generationProgress).toBeNull();
		expect(page.busy).toBe(false);
	});

	test('empty and stale selections fail before any requests', async () => {
		for (const classGroupIds of [[], ['a', 'other-year-class']]) {
			const result = await state().generate({ classGroupIds, startDate: '2026-10-05', endDate: '2026-10-09' });
			expect(result).toMatchObject({ ok: false, error: { summary: 'timetable.invalidClassSelection' } });
		}
		expect(generationCalls).toEqual([]);
		expect(versions).toEqual([]);
	});

	test('a later failure retains earlier commits and does not attempt remaining classes', async () => {
		failedClass = 'b';
		const page = state();
		let refreshes = 0;
		page.load = async () => {
			refreshes++;
		};
		const result = await page.generate({ classGroupIds: ['a', 'b', 'c'], startDate: '2026-10-05', endDate: '2026-10-09' });
		expect(result.ok).toBe(false);
		expect(generationCalls).toEqual(['a', 'b']);
		expect(versions).toEqual(['planning']);
		expect(refreshes).toBe(1);
		expect(page.generationProgress).toBeNull();
		expect(page.busy).toBe(false);
	});
});
