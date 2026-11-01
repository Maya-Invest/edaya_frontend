import { expect, test } from 'bun:test';
import { canonicalAttendanceTaskHref } from '../../../src/routes/(app)/classes/[classId]/attendance/lib/attendance-task';

test('legacy daily roll-call addresses canonicalize without changing class, filters or view', () => {
	for (const surface of ['modal=create-roll-call&modalTarget=other', 'task=create-roll-call&taskStep=old']) {
		expect(canonicalAttendanceTaskHref(new URL(`https://local/classes/a/attendance?q=ada&view=table&${surface}`)))
			.toBe('/classes/a/attendance?q=ada&view=table&task=attendance-roll-call&taskPanel=create');
	}
});
test('daily task address has one panel and no arbitrary record target', () => {
	expect(canonicalAttendanceTaskHref(new URL('https://local/classes/a/attendance?task=attendance-roll-call&taskTarget=other&taskPanel=unknown')))
		.toBe('/classes/a/attendance?task=attendance-roll-call&taskPanel=create');
	expect(canonicalAttendanceTaskHref(new URL('https://local/classes/a/attendance?task=attendance-roll-call&taskPanel=create'))).toBeNull();
	expect(canonicalAttendanceTaskHref(new URL('https://local/classes/a/attendance?task=import'))).toBeNull();
});

import { saveAttendanceDraft, sessionAttendanceTaskHref } from '../../../src/routes/(app)/classes/[classId]/timetable/lib/attendance-task';
import type { SessionAttendanceStatus } from '../../../src/lib/types/session-detail';

const rows = ['a', 'b', 'c'].map(studentId => ({ studentId, studentName: studentId, studentInitials: studentId }));
const draft: Record<string, SessionAttendanceStatus> = { a: 'present', b: 'absent', c: 'late', outsider: 'present' };

test('session address scopes the task to the exact occurrence and preserves calendar query', () => {
	expect(sessionAttendanceTaskHref(new URL('https://local/classes/6a/timetable?week=2026-10-19&q=math&modal=attendance&modalTarget=old'), '6a', 'lesson-1'))
		.toBe('/classes/6a/timetable/lesson-1/attendance?week=2026-10-19&q=math&task=attendance-roll-call&taskTarget=lesson-1&taskPanel=session');
});
test('atomic lesson save sends only changed authorized rows and keeps all on failure', async () => {
	let baseline: Partial<Record<string, SessionAttendanceStatus>> = { a: 'present' };
	const requests: unknown[] = [];
	let ok = false;
	const save = () => saveAttendanceDraft({ rows, draft, baseline, canContinue: () => true,
		saveBatch: async marks => { requests.push(marks); return ok; },
		saveRow: async () => { throw new Error('Wrong save unit'); },
		onSaved: marks => { baseline = { ...baseline, ...marks }; } });
	expect(await save()).toEqual({ saved: [], failed: ['b', 'c'], remaining: ['b', 'c'] });
	expect(baseline).toEqual({ a: 'present' });
	ok = true;
	expect(await save()).toEqual({ saved: ['b', 'c'], failed: [], remaining: [] });
	expect(requests).toEqual([{ b: 'absent', c: 'late' }, { b: 'absent', c: 'late' }]);
	expect((await save()).saved).toEqual([]);
	expect(requests).toHaveLength(2);
});
test('per-record partial success retries only failed rows, never submitted successes', async () => {
	let baseline: Partial<Record<string, SessionAttendanceStatus>> = {};
	let fail = true;
	const requests: string[] = [];
	const save = () => saveAttendanceDraft({ rows, draft, baseline, canContinue: () => true,
		saveRow: async row => { requests.push(row.studentId); return row.studentId !== 'b' || !fail; },
		onSaved: marks => { baseline = { ...baseline, ...marks }; } });
	expect(await save()).toEqual({ saved: ['a', 'c'], failed: ['b'], remaining: ['b'] });
	expect(baseline).toEqual({ a: 'present', c: 'late' });
	fail = false;
	expect(await save()).toEqual({ saved: ['b'], failed: [], remaining: [] });
	expect(requests).toEqual(['a', 'b', 'c', 'b']);
});
test('closing or losing authority stops unsent per-record writes without undoing confirmed ones', async () => {
	let allowed = true;
	const saved: unknown[] = [];
	const progress = await saveAttendanceDraft({ rows, draft, baseline: {}, canContinue: () => allowed,
		saveRow: async () => { allowed = false; return true; }, onSaved: marks => { saved.push(marks); } });
	expect(progress).toEqual({ saved: ['a'], failed: [], remaining: ['b', 'c'] });
	expect(saved).toEqual([{ a: 'present' }]);
});
