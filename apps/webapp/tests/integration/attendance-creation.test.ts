import type { AttendanceDay } from '../../src/lib/types/school';
import type { SessionAttendanceRow } from '../../src/lib/types/session-detail';
import { plugin } from 'bun';
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'attendance-runes', setup(build) {
	build.onLoad({ filter: /attendance-page\.svelte\.ts$/ }, async ({ path }) => ({ contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(path).text()), { filename: path, generate: 'client' }).js.code, loader: 'js' }));
} });
const versions: string[] = [];
const errors: string[] = [];
const requests: Array<{ classGroupId: string; date: string; attendanceByStudent: Record<string, string> }> = [];
const academic = { schoolScopeId: 'school', yearId: 'year', schools: [{ id: 'school', timeZone: 'America/Toronto' }], classes: [{ id: 'a', schoolId: 'school', attendanceMode: 'daily' }] };
let allowed = true;
let failWrite = false;
let failRefresh = false;
let failRead = false;
let duplicate: AttendanceDay | undefined;
let persisted: AttendanceDay[] = [];
let roster: SessionAttendanceRow[] = [];
let waitForRoster: Promise<SessionAttendanceRow[]> | undefined;
let waitForWrite: Promise<void> | undefined;
const date = '2026-01-01';
const marks = { s1: 'absent' as const, s2: 'late' as const };
const day = { id: `a:${date}`, classId: 'a', date, label: 'attendanceDay.dailyRollCall', totalStudents: 2, recordedCount: 2 };
mock.module('$lib/academic/context.svelte', () => ({ academicContext: academic }));
mock.module('$lib/auth/session.svelte', () => ({ authSession: { userId: 'staff' } }));
mock.module('$lib/permissions', () => ({ hasPermission: () => allowed }));
mock.module('$lib/modal/modal-state.svelte', () => ({ createUrlSyncedModals: () => ({}) }));
mock.module('$lib/api/mutations/documents.mutations', () => ({ requestDocumentIssuanceMutation: async () => {} }));
mock.module('$lib/api/attendance-data', () => ({
	loadAttendanceRoster: async () => { if (failRead) throw new Error('Unavailable'); return waitForRoster ?? roster; },
	findAttendanceDayForDate: async () => { if (failRead) throw new Error('Unavailable'); return duplicate; },
}));
mock.module('../../src/routes/(app)/classes/[classId]/attendance/lib/attendance-queries', () => ({
	queryAttendanceListPage: () => {},
	loadAttendanceSlice: async () => { if (failRefresh) throw new Error('Unavailable'); return { classId: 'a', attendanceDays: persisted }; },
}));
mock.module('$lib/api/school-client', () => ({ getBrowserSchoolClient: () => ({ commands: {
	recordClassDailyAttendance: async (input: typeof requests[number]) => {
		requests.push(input);
		if (waitForWrite) await waitForWrite;
		if (failWrite) throw new Error('Write failed');
		persisted = [day];
		return Object.entries(input.attendanceByStudent).map(([studentId, status]) => ({ studentId, status, attendanceId: day.id }));
	},
} }) }));
mock.module('$lib/entity-versions.svelte', () => ({ entityVersions: { bump: (key: string) => versions.push(key) } }));
mock.module('$lib/navigation/route-version-snapshot', () => ({ RouteVersionSnapshot: class { markLoaded() {} isStale() { return false; } } }));
mock.module('$lib/i18n', () => ({ t: { subscribe: (fn: (value: (key: string) => string) => void) => { fn(key => key); return () => {}; } } }));
mock.module('$lib/toast.svelte', () => ({ toast: { success: () => {}, error: (message: string) => errors.push(message) } }));
const { AttendancePageState } = await import('../../src/routes/(app)/classes/[classId]/attendance/attendance-page.svelte');
async function page() {
	const state = new AttendancePageState(() => new URL('http://local/classes/a/attendance'));
	state.seed('a', { attendanceDays: [] });
	await state.loadCreationRoster();
	return state;
}
beforeEach(() => {
	versions.length = errors.length = requests.length = 0;
	allowed = true;
	failWrite = failRead = failRefresh = false;
	duplicate = undefined;
	persisted = [];
	waitForRoster = undefined;
	waitForWrite = undefined;
	academic.yearId = 'year';
	academic.classes[0]!.attendanceMode = 'daily';
	roster = ['s1', 's2'].map(studentId => ({ studentId, studentName: studentId, studentInitials: studentId }));
});
describe('new daily roll call', () => {
	test('saves once, excludes non-roster IDs, and reloads the persisted occurrence', async () => {
		const state = await page();
		expect(await state.createRollCall(date, { ...marks, outsider: 'present' })).toEqual(day);
		expect(requests).toHaveLength(1);
		expect(requests[0]).toMatchObject({ classGroupId: 'a', date, attendanceByStudent: marks });
		expect(state.daysFor('a')).toEqual([day]);
		expect(versions).toEqual(['attendance']);
		const reloaded = await page();
		await reloaded.refreshSlice('a');
		expect(reloaded.daysFor('a')).toEqual([day]);
	});
	test('requires permission, daily mode, a complete nonempty roster, and a valid date', async () => {
		const state = await page();
		for (const invalid of ['', '2099-01-01', '2026-02-30']) expect(await state.createRollCall(invalid, marks)).toBeNull();
		expect(await state.createRollCall(date, { s1: 'present' })).toBeNull();
		allowed = false;
		expect(await state.createRollCall(date, marks)).toBeNull();
		allowed = true;
		academic.classes[0]!.attendanceMode = 'session';
		expect(await state.createRollCall(date, marks)).toBeNull();
		academic.classes[0]!.attendanceMode = 'daily';
		roster = [];
		await state.loadCreationRoster();
		expect(await state.createRollCall(date, {})).toBeNull();
		expect(requests).toHaveLength(0);
	});
	test('existing dates refresh without writing over records', async () => {
		const state = await page();
		duplicate = day;
		persisted = [day];
		expect(await state.createRollCall(date, marks)).toBeNull();
		expect(requests).toHaveLength(0);
		expect(state.daysFor('a')).toEqual([day]);
		expect(errors).toEqual(['attendanceDay.alreadyExists']);
	});
	test('read failures fail closed; write failures roll back and permit retry', async () => {
		const state = await page();
		failRead = true;
		expect(await state.createRollCall(date, marks)).toBeNull();
		expect(requests).toHaveLength(0);
		failRead = false;
		failWrite = true;
		expect(await state.createRollCall(date, marks)).toBeNull();
		expect(state.daysFor('a')).toEqual([]);
		expect(versions).toEqual([]);
		expect(state.creating).toBe(false);
		failWrite = false;
		expect(await state.createRollCall(date, marks)).toEqual(day);
	});
	test('refresh failure retains the saved day without resubmitting', async () => {
		const state = await page();
		failRefresh = true;
		expect(await state.createRollCall(date, marks)).toEqual(day);
		expect(state.daysFor('a')).toEqual([day]);
		expect(requests).toHaveLength(1);
		expect(versions).toEqual(['attendance']);
		expect(errors).toEqual(['mutation.savedRefreshFailed']);
	});
	test('stale roster responses cannot enable submission in another scope', async () => {
		const state = await page();
		let resolve!: (rows: SessionAttendanceRow[]) => void;
		waitForRoster = new Promise(done => { resolve = done; });
		const loading = state.loadCreationRoster();
		academic.yearId = 'other';
		state.cancelRosterLoad();
		resolve(roster);
		await loading;
		expect(state.roster).toEqual([]);
		expect(await state.createRollCall(date, marks)).toBeNull();
	});
	test('double submit sends once and late results do not navigate a changed scope', async () => {
		const state = await page();
		let resolve!: () => void;
		waitForWrite = new Promise(done => { resolve = done; });
		const saving = state.createRollCall(date, marks);
		expect(await state.createRollCall(date, marks)).toBeNull();
		await new Promise(done => setTimeout(done, 0));
		academic.yearId = 'other';
		state.seed('a', { attendanceDays: [] });
		resolve();
		expect(await saving).toBeNull();
		expect(requests).toHaveLength(1);
		expect(state.daysFor('a')).toEqual([]);
	});
});
