import type { TimetablePageState } from '../../src/routes/(app)/classes/[classId]/timetable/timetable-page.svelte';
import { plugin } from 'bun';
import { beforeEach, expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'session-attendance-runes', setup(build) {
	build.onLoad({ filter: /session-attendance-tab\.svelte\.ts$/ }, async ({ path }) => ({ contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(path).text()), { filename: path, generate: 'client' }).js.code, loader: 'js' }));
} });
const academic = { schoolScopeId: 'school', yearId: 'year', classes: [{ id: 'a', attendanceMode: 'session' }] };
let allowed = true;
let kind = 'lesson';
let fails = false;
let wait: Promise<void> | undefined;
const requests: Array<Record<string, unknown>> = [];
mock.module('$lib/academic/context.svelte', () => ({ academicContext: academic }));
mock.module('$lib/auth/session.svelte', () => ({ authSession: { userId: 'staff' } }));
mock.module('$lib/permissions', () => ({ hasPermission: () => allowed }));
mock.module('$lib/entity-versions.svelte', () => ({ entityVersions: { bump: () => {} } }));
mock.module('$lib/toast.svelte', () => ({ toast: { success: () => {}, error: () => {} } }));
mock.module('$lib/i18n', () => ({ t: { subscribe: (fn: (value: (key: string) => string) => void) => { fn(key => key); return () => {}; } } }));
mock.module('$lib/api/school-client', () => ({ getBrowserSchoolClient: () => ({ commands: {
	recordAttendance: async (input: Record<string, unknown>) => { requests.push(input); await wait; if (fails) throw new Error('failed'); return input; },
	recordLessonSessionAttendance: async (input: Record<string, unknown>) => { requests.push(input); await wait; if (fails) throw new Error('failed'); return Object.entries(input.attendanceByStudent as Record<string, string>).map(([studentId, status]) => ({ studentId, status, id: `server-${studentId}` })); },
} }) }));
const { SessionAttendanceTabState } = await import('../../src/routes/(app)/classes/[classId]/timetable/[id]/(tabs)/attendance/session-attendance-tab.svelte');
const roster = ['s1', 's2'].map(studentId => ({ studentId, studentName: studentId, studentInitials: studentId }));
function owner() {
	const state = new SessionAttendanceTabState(() => ({ classId: 'a', selectedSession: (_: string, id: string) => id === 'session' ? { id, kind, classId: 'a' } : undefined }) as unknown as TimetablePageState);
	state.seed('session', roster);
	return state;
}
beforeEach(() => { allowed = true; kind = 'lesson'; fails = false; wait = undefined; requests.length = 0; academic.yearId = 'year'; academic.classes[0]!.attendanceMode = 'session'; });
test('record writes require an exact authorized occurrence, kind and roster member', async () => {
	const state = owner();
	for (const input of [{ sessionId: 'other', studentId: 's1' }, { sessionId: 'session', studentId: 'other' }, { sessionId: 'session', studentId: 's1', kind: 'activity' as const }])
		expect(await state.recordStudentAttendance({ ...input, status: 'present' })).toBe(false);
	allowed = false;
	expect(await state.recordStudentAttendance({ sessionId: 'session', studentId: 's1', status: 'present' })).toBe(false);
	expect(await state.recordBulkAttendance({ sessionId: 'session', attendanceByStudent: { s1: 'present' } })).toBe(false);
	expect(requests).toHaveLength(0);
});
test('failed new records restore unrecorded status and retry the same record identity', async () => {
	const state = owner();
	fails = true;
	const input = { sessionId: 'session', studentId: 's1', status: 'absent' as const, attendanceId: 'untrusted-other-target' };
	expect(await state.recordStudentAttendance(input)).toBe(false);
	expect(state.attendanceFor('session')[0]?.status).toBeUndefined();
	expect(state.attendanceFor('session')[0]?.attendanceId).toBeUndefined();
	fails = false;
	expect(await state.recordStudentAttendance(input)).toBe(true);
	expect(requests.map(row => row.id)).toEqual(['s1-session', 's1-session']);
});
test('lesson batch retains atomic payload and returned IDs; non-lessons cannot use it', async () => {
	const state = owner();
	expect(await state.recordBulkAttendance({ sessionId: 'session', attendanceByStudent: { s1: 'present', s2: 'late' } })).toBe(true);
	expect(requests).toHaveLength(1);
	expect(state.attendanceFor('session').map(row => row.attendanceId)).toEqual(['server-s1', 'server-s2']);
	kind = 'activity';
	expect(await state.recordBulkAttendance({ sessionId: 'session', attendanceByStudent: { s1: 'present' } })).toBe(false);
	expect(await state.recordStudentAttendance({ sessionId: 'session', kind: 'activity', studentId: 's1', status: 'absent' })).toBe(true);
	expect(requests[1]).toMatchObject({ activitySessionId: 'session', id: 'server-s1' });
});
test('pending writes exclude conflicting duplicate/batch writes and late failure cannot overwrite a fresh read', async () => {
	const state = owner();
	let finish!: () => void;
	wait = new Promise(resolve => { finish = resolve; });
	fails = true;
	const input = { sessionId: 'session', studentId: 's1', status: 'absent' as const };
	const saving = state.recordStudentAttendance(input);
	expect(await state.recordStudentAttendance(input)).toBe(false);
	expect(await state.recordBulkAttendance({ sessionId: 'session', attendanceByStudent: { s1: 'present' } })).toBe(false);
	state.seed('session', roster.map(row => ({ ...row, status: 'late' as const })));
	finish();
	expect(await saving).toBe(false);
	expect(state.attendanceFor('session')[0]?.status).toBe('late');
	expect(requests).toHaveLength(1);
});
test('late failed writes cannot alter the same session ID in a changed school-year scope', async () => {
	const state = owner();
	let finish!: () => void;
	wait = new Promise(resolve => { finish = resolve; });
	fails = true;
	const saving = state.recordBulkAttendance({ sessionId: 'session', attendanceByStudent: { s1: 'absent' } });
	academic.yearId = 'other';
	state.seed('session', roster.map(row => ({ ...row, status: 'present' as const })));
	finish();
	expect(await saving).toBe(false);
	expect(state.attendanceFor('session')[0]?.status).toBe('present');
});

test('daily classes retain historical session reads but cannot issue session writes', async () => {
	const state = owner();
	academic.classes[0]!.attendanceMode = 'daily';
	expect(state.dailyMode).toBe(true);
	expect(state.attendanceFor('session')).toHaveLength(2);
	expect(await state.recordBulkAttendance({ sessionId: 'session', attendanceByStudent: { s1: 'present' } })).toBe(false);
	expect(await state.recordStudentAttendance({ sessionId: 'session', studentId: 's1', status: 'present' })).toBe(false);
	expect(requests).toHaveLength(0);
});
