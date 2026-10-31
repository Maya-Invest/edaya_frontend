import type { EnrollmentEditorContext, ParticipationData } from '../../src/lib/subjects/enrollment-editor';
import type { components } from '../../src/lib/api/schema';
import { plugin } from 'bun';
import { beforeEach, expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'subject-enrollment-runes', setup(build) {
	build.onLoad({ filter: /(?:subject-enrollment-state|list-selection-state)\.svelte\.ts$/ }, async ({ path }) => ({ contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(path).text()), { filename: path, generate: 'client' }).js.code, loader: 'js' }));
} });
mock.module('$lib/academic/context.svelte', () => ({ academicContext: {} }));
mock.module('$lib/auth/session.svelte', () => ({ authSession: {} }));
mock.module('$lib/permissions', () => ({ hasPermission: () => true }));
mock.module('$lib/api/school-client', () => ({ getBrowserSchoolClient: () => ({}) }));
const bumps: string[] = [];
const errors: string[] = [];
mock.module('$lib/entity-versions.svelte', () => ({ entityVersions: { bump: (key: string) => bumps.push(key) } }));
mock.module('$lib/toast.svelte', () => ({ toast: { success: () => {}, error: (message: string) => errors.push(message) } }));
mock.module('$lib/i18n', () => ({ t: { subscribe: (fn: (value: (key: string) => string) => void) => { fn(key => key); return () => {}; } } }));
const { SubjectEnrollmentState } = await import('../../src/lib/smart-components/subject-enrollment/subject-enrollment-state.svelte');
type Command = components['schemas']['ManageStudentSubjectEnrollmentsCommand'];
const context: EnrollmentEditorContext = { schoolId: 'school', academicYearId: 'year', classGroupId: 'class', className: 'Class', yearName: 'Year', zone: 'UTC', students: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] };
function data(id: string, revision = 1): ParticipationData {
	return { studentId: id, placements: [{ id: `p-${id}`, studentId: id, classGroupId: 'class', academicYearId: 'year', status: 'active' }], periods: [], enrollments: [], offerings: ['music', 'art'].map(id => ({ id, classGroupId: 'class', name: id, isOptional: true, isOffered: true, participationRevision: revision })) } as unknown as ParticipationData;
}
beforeEach(() => { bumps.length = 0; errors.length = 0; });
test('individual, teaching and list contexts share one changed-pair submission path', async () => {
	for (const entry of [{ ...context, classSubjectId: 'music', students: [context.students[0]!] }, { ...context, classSubjectId: 'music', chooseStudents: true }, context]) {
		const commands: Command[] = [];
		const state = new SubjectEnrollmentState({ allowed: () => true, identity: () => 'staff', load: async id => data(id), submit: async command => { commands.push(command); return { enrollmentIds: ['e'], revisions: {} }; } });
		await state.open(entry);
		if (entry.chooseStudents) {
			expect(state.canSave).toBe(false);
			state.toggleStudent('a', true); state.toggleStudent('b', true);
		}
		if (!entry.classSubjectId) {
			expect(state.canSave).toBe(false);
			state.editSubject('music', true);
		}
		expect(await state.save()).toBe(true);
		expect(commands).toHaveLength(1);
		expect(commands[0]!.operations).toHaveLength(entry.students.length);
		expect(commands[0]!.operations.every(op => op.classSubjectId === 'music')).toBe(true);
	}
});
test('lost responses preserve exact request identity, pending saves exclude duplicates', async () => {
	const commands: Command[] = [];
	let finish!: () => void;
	let wait: Promise<void> | undefined = new Promise(resolve => { finish = resolve; });
	let fail = true;
	const state = new SubjectEnrollmentState({ allowed: () => true, identity: () => 'staff', load: async id => data(id), submit: async command => { commands.push(structuredClone(command)); await wait; if (fail) throw new Error('lost response'); return { enrollmentIds: ['e'], revisions: {} }; } });
	await state.open({ ...context, classSubjectId: 'music' });
	const saving = state.save(); expect(await state.save()).toBe(false); finish(); expect(await saving).toBe(false);
	expect(state.error).toBe('lost response'); expect(state.canSave).toBe(true); expect(bumps).toHaveLength(0);
	fail = false; wait = undefined;
	expect(await state.save()).toBe(true); expect(commands[0]).toEqual(commands[1]); expect(bumps).toContain('subjectEnrollments');
});
test('revision conflicts refresh current data, retain choices and need an explicit new save', async () => {
	let revision = 1; const commands: Command[] = [];
	const state = new SubjectEnrollmentState({ allowed: () => true, identity: () => 'staff', load: async id => data(id, revision), submit: async command => { commands.push(command); if (revision === 1) { revision = 2; throw { body: { code: 'SUBJECT_PARTICIPATION_REVISION_CONFLICT' } }; } return { enrollmentIds: ['e'], revisions: {} }; } });
	await state.open(context); state.editSubject('music', true);
	expect(await state.save()).toBe(false); expect(commands).toHaveLength(1); expect(state.drafts.music?.enabled).toBe(true); expect(state.error).toBe('participation.reloadReview');
	expect(await state.save()).toBe(true); expect(commands[1]!.expectedRevisions.music).toBe(2); expect(commands[1]!.requestId).not.toBe(commands[0]!.requestId);
});
test('one invalid read blocks the whole selection and loading is bounded to four students', async () => {
	let active = 0; let max = 0;
	const state = new SubjectEnrollmentState({ allowed: () => true, identity: () => 'staff', load: async id => { ++active; max = Math.max(max, active); await new Promise(resolve => setTimeout(resolve, 2)); --active; const result = data(id); if (id === '5') result.placements = []; return result; } });
	await state.open({ ...context, students: Array.from({ length: 12 }, (_, i) => ({ id: String(i), name: String(i) })) });
	expect(max).toBeLessThanOrEqual(4); expect(state.loadError).toBe('participation.invalidPlacement'); expect(state.canSave).toBe(false); expect(state.data).toHaveLength(0);
});
test('scope changes and closure discard late reads; permission loss blocks writes', async () => {
	let identity = 'staff'; let allowed = true; let finish!: () => void;
	const wait = new Promise<void>(resolve => { finish = resolve; });
	const state = new SubjectEnrollmentState({ allowed: () => allowed, identity: () => identity, load: async id => { await wait; return data(id); } });
	const loading = state.open(context); identity = 'other'; finish(); await loading;
	expect(state.data).toHaveLength(0); expect(state.allowed).toBe(false); expect(await state.save()).toBe(false);
	identity = 'staff'; await state.open(context); state.editSubject('music', true); allowed = false;
	expect(await state.save()).toBe(false); state.close(); expect(state.context).toBeNull();
});
test('500 changed pairs are allowed and 501 block the whole save', async () => {
	const state = new SubjectEnrollmentState({ allowed: () => true, identity: () => 'staff', load: async id => data(id) });
	await state.open({ ...context, students: Array.from({ length: 501 }, (_, i) => ({ id: String(i), name: String(i) })) });
	state.editSubject('music', true); expect(state.operations).toHaveLength(501); expect(state.overLimit).toBe(true); expect(await state.save()).toBe(false);
	state.selectedIds = state.selectedIds.slice(0, 500); expect(state.overLimit).toBe(false); expect(state.canSave).toBe(true);
});
test('a failed read after confirmed save never resends the command', async () => {
	let submissions = 0;
	const state = new SubjectEnrollmentState({ allowed: () => true, identity: () => 'staff', load: async id => data(id), submit: async () => { ++submissions; return { enrollmentIds: ['e'], revisions: {} }; } });
	await state.open({ ...context, classSubjectId: 'music' }); expect(await state.save()).toBe(true);
	await state.refreshAfterSave(async () => { throw new Error('read failed'); }); expect(errors).toContain('mutation.savedRefreshFailed'); expect(await state.save()).toBe(false); expect(submissions).toBe(1);
});


test('list selection survives the same scope and view changes, and clears on query or permission changes', async () => {
  const { ListSelectionState } = await import('../../src/lib/list/list-selection-state.svelte');
  const selection = new ListSelectionState<{ id: string }>();
  selection.syncScope('school:year:class:query:grants');
  selection.enterSelectionMode(); selection.toggleVisible([{ id: 'a' }, { id: 'b' }], true);
  selection.syncScope('school:year:class:query:grants');
  expect(selection.selectedIds).toEqual(['a', 'b']);
  selection.syncScope('school:year:class:new-query:grants'); expect(selection.selectedIds).toEqual([]);
  selection.toggleSelected('a', true);
  selection.syncScope('school:year:class:new-query:revoked'); expect(selection.selectedIds).toEqual([]);
});
