import type { TeachersPageState } from '../../src/routes/(app)/school/teachers/teachers-page.svelte';
import type { TeacherTimetableEvent } from '../../src/routes/(app)/school/teachers/lib/teacher-timetable';
import { plugin } from 'bun';
import { afterEach, describe, expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'teacher-timetable-runes', setup(build) {
	build.onLoad({ filter: /teacher-timetable-tab\.svelte\.ts$/ }, async ({ path }) => ({ contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(path).text()), { filename: path, generate: 'client' }).js.code, loader: 'js' }));
} });
const academic = { years: [{ id: 'year', schoolId: 'school', startDate: '2026-09-01T00:00:00.000Z', endDate: '2027-06-30T00:00:00.000Z' }], schools: [{ id: 'school', timeZone: 'UTC' }] };
let scope = { schoolId: 'school', academicYearId: 'year' };
const pending: Array<{ input: { teacherId: string; startDate: string; endDate: string }; resolve: (value: { events: TeacherTimetableEvent[] }) => void; reject: (error: Error) => void }> = [];
mock.module('$lib/academic/context.svelte', () => ({ academicContext: academic }));
mock.module('$lib/api/school-client', () => ({ getBrowserSchoolClient: () => ({ queries: { getTeacherTimetable: (input: { teacherId: string; startDate: string; endDate: string }) => new Promise((resolve, reject) => pending.push({ input, resolve, reject })) } }) }));
mock.module('$lib/navigation/route-version-snapshot', () => ({ RouteVersionSnapshot: class {
	markLoaded() {}
	hasLoaded() { return false; }
	isStale() { return false; }
} }));
const { TeacherTimetableTabState } = await import('../../src/routes/(app)/school/teachers/[[id]]/(tabs)/timetable/teacher-timetable-tab.svelte');
const event: TeacherTimetableEvent = { id: 'session', kind: 'lesson', classGroupId: 'class', title: 'Math', startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z' };
const url = (teacher = 'teacher') => new URL(`https://local/school/teachers/${teacher}/timetable?date=2026-10-01`);
const state = () => new TeacherTimetableTabState(() => ({ teacherScope: () => scope }) as TeachersPageState);
afterEach(() => { pending.length = 0; scope = { schoolId: 'school', academicYearId: 'year' }; });
describe('teacher timetable route state', () => {
	test('requests the complete year and exposes events only for the matching context', async () => {
		const tab = state(); const load = tab.query()(url());
		await Bun.sleep(0);
		expect(pending[0]?.input).toEqual({ teacherId: 'teacher', startDate: '2026-09-01', endDate: '2027-06-30' });
		pending[0]!.resolve({ events: [event] }); await load;
		expect(tab.eventsFor('teacher')).toEqual([event]);
		expect(tab.eventsFor('other')).toEqual([]);
		scope = { ...scope, academicYearId: 'other' };
		expect(tab.eventsFor('teacher')).toEqual([]);
	});
	test('an older teacher response cannot replace a newer teacher', async () => {
		const tab = state(); const query = tab.query(); const first = query(url());
		await Bun.sleep(0); const second = query(url('other')); await Bun.sleep(0);
		pending[1]!.resolve({ events: [{ ...event, id: 'new' }] }); await second;
		pending[0]!.resolve({ events: [event] }); await first;
		expect(tab.eventsFor('other').map(row => row.id)).toEqual(['new']);
	});
	test('ignores a response after the academic year changes', async () => {
		const tab = state(); const load = tab.query()(url()); await Bun.sleep(0);
		scope = { ...scope, academicYearId: 'other' };
		pending[0]!.resolve({ events: [event] }); await load;
		expect(tab.slice).toBeNull();
	});
	test('clearing the drawer invalidates an outstanding request', async () => {
		const tab = state(); const load = tab.query()(url()); await Bun.sleep(0); tab.clear();
		pending[0]!.resolve({ events: [event] }); await load;
		expect(tab.slice).toBeNull();
	});
	test('missing year context makes no request and failures remain errors', async () => {
		const tab = state(); scope = { ...scope, academicYearId: 'missing' };
		await tab.query()(url()); expect(pending).toEqual([]);
		scope = { ...scope, academicYearId: 'year' };
		const load = tab.query()(url()); await Bun.sleep(0); pending[0]!.reject(new Error('offline'));
		expect((await load).status).toBe('error'); expect(tab.slice).toBeNull();
	});
});
