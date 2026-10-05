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
mock.module('$lib/academic/context.svelte', () => ({ academicContext: { classes: [], gradeLevels: [], yearId: 'year' } }));
mock.module('$lib/api/mutations/timetable-generation.mutations', () => ({ generateClassTimetable: async () => ({}), publishClassTimetable: async () => { writes++; if (requestError) throw requestError; return published; } }));
mock.module('$lib/api/school-client', () => ({ getBrowserSchoolClient: () => ({ entities: {} }) }));
mock.module('$lib/entity-versions.svelte', () => ({ entityVersions: { bump: (key: string) => versions.push(key) } }));
mock.module('$lib/i18n', () => ({ lang: { subscribe: (fn: (value: string) => void) => { fn('fr'); return () => {}; } }, t: { subscribe: (fn: (value: unknown) => void) => { fn((key: string) => key); return () => {}; } } }));
mock.module('$lib/toast.svelte', () => ({ toast: { success: () => {}, error: (message: string) => errors.push(message) } }));
mock.module('$lib/navigation/route-version-snapshot', () => ({ RouteVersionSnapshot: class { markLoaded() {} hasLoaded() { return false; } isStale() { return false; } } }));
const { TimetablePlanningPageState } = await import('../../src/routes/(app)/configuration/tools/timetable-planning-page.svelte');
const { ApiError } = await import('@maya-invest/edaya-api-client');
afterEach(() => { requestError = null; refreshError = false; writes = 0; versions.length = 0; errors.length = 0; });
function state() {
	const page = new TimetablePlanningPageState();
	page.load = async () => { if (refreshError) throw new Error('Refresh failed'); };
	return page;
}
describe('timetable publication outcomes', () => {
	test('successful publication invalidates planning and releases busy state', async () => {
		const page = state(); expect(await page.publish('class', '2026-10-05', '2026-10-09', 'fail')).toEqual(published);
		expect(versions).toEqual(['planning']); expect(page.busy).toBe(false); expect(writes).toBe(1);
	});
	test('refresh failure retains a confirmed publication without a retry', async () => {
		refreshError = true; const page = state();
		expect(await page.publish('class', '2026-10-05', '2026-10-09', 'fail')).toEqual(published);
		expect(writes).toBe(1); expect(versions).toEqual(['planning']); expect(errors).toEqual(['mutation.savedRefreshFailed']);
	});
	test('a publication conflict does not invalidate or retry', async () => {
		requestError = new ApiError(409, { code: 'TIMETABLE_PUBLISHED_ALREADY_EXISTS' }); const page = state();
		expect(await page.publish('class', '2026-10-05', '2026-10-09', 'fail')).toBeNull();
		expect(writes).toBe(1); expect(versions).toEqual([]); expect(page.busy).toBe(false); expect(errors).toEqual(['timetable.errorPublishedExists']);
	});
});
