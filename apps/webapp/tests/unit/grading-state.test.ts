import type { Evaluation } from '../../src/lib/types/school';
import type { components } from '../../src/lib/api/schema';
import { plugin } from 'bun';
import { beforeEach, expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';
import { writable } from 'svelte/store';
import { marksReview } from '../fixtures/grading/data';
plugin({ name: 'grading-state-runes', setup(build) {
	build.onLoad({ filter: /(?:evaluations-page|evaluation-grading-tab)\.svelte\.ts$/ }, async ({ path }) => ({ contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(path).text()), { filename: path, generate: 'client' }).js.code, loader: 'js' }));
} });
const academic = { schoolScopeId: 'school', yearId: 'year', scopeGeneration: 0 };
let allowed = true, failWrite = false, failRead = false;
let wait: Promise<void> | undefined, readWait: Promise<void> | undefined;
let server = marksReview();
const requests: Array<Record<string, unknown>> = [];
const errors: string[] = [];
mock.module('$lib/academic/context.svelte', () => ({ academicContext: academic }));
mock.module('$lib/auth/session.svelte', () => ({ authSession: { userId: 'staff' } }));
mock.module('$lib/permissions', () => ({ hasPermission: () => allowed }));
mock.module('$lib/entity-versions.svelte', () => ({ entityVersions: { bump: () => {} } }));
mock.module('$lib/toast.svelte', () => ({ toast: { success: () => {}, error: (message: string) => errors.push(message) } }));
mock.module('$lib/i18n', () => ({ locale: writable('en'), t: writable((key: string) => key) }));
mock.module('$lib/api/school-client', () => ({ getBrowserSchoolClient: () => ({
	queries: { getAssessmentMarksReview: async () => { const value = structuredClone(server); await readWait; if (failRead) throw new Error('Read failed'); return value; } },
	commands: {
		recordAssessmentResult: async (input: components['schemas']['RecordAssessmentResultCommand']) => {
			requests.push(input); await wait;
			if (failWrite) throw new Error('Write failed');
			const previous = server.results.find(row => row.id === input.id);
			const result = { ...previous, ...input, revision: (previous?.revision ?? 0) + 1 };
			server.results = [...server.results.filter(row => row.id !== result.id), result]; server.assessment.marksRevision++;
			return result;
		},
		requestAssessmentMarksCorrection: async (input: Record<string, unknown>) => { requests.push(input); await wait; if (failWrite) throw new Error('Write failed'); return {}; },
		approveAssessmentMarksCorrection: async (input: Record<string, unknown>) => { requests.push(input); return {}; },
	},
}) }));
const { EvaluationsPageState } = await import('../../src/routes/(app)/classes/[classId]/evaluations/evaluations-page.svelte');
const { EvaluationGradingTabState } = await import('../../src/routes/(app)/classes/[classId]/evaluations/[[id]]/(tabs)/grading/evaluation-grading-tab.svelte');
function owner() {
	let url = new URL('https://school.test/classes/class/evaluations/assessment/grading');
	const state = new EvaluationsPageState(() => url);
	const grading = new EvaluationGradingTabState(); state.attachGrading(grading);
	state.seed('class', { evaluations: [{ id: 'assessment', classId: 'class', classSubjectId: 'subject' } as Evaluation] });
	grading.adopt('class', structuredClone(server));
	return { state, grading, navigate: (path: string) => { url = new URL(path, url); } };
}
const draft = { score: '12', mentionId: '', designation: 'scored' as const };
beforeEach(() => { allowed = true; failWrite = false; failRead = false; wait = undefined; readWait = undefined; server = marksReview(); requests.length = 0; errors.length = 0; academic.yearId = 'year'; academic.scopeGeneration = 0; });
test('entry needs exact authorized assessment, student, draft status and nonpublished result', async () => {
	const { state, grading } = owner(); const snapshot = structuredClone(server);
	expect((await state.saveGrade(snapshot, 'other', draft, { scope: state.scope })).saved).toBe(false);
	allowed = false; expect((await state.saveGrade(snapshot, 's1', draft, { scope: state.scope })).saved).toBe(false); allowed = true;
	grading.review!.publishedResultIds = ['existing-id']; expect((await state.saveGrade(snapshot, 's1', draft, { scope: state.scope })).saved).toBe(false);
	grading.review!.publishedResultIds = []; grading.review!.assessment.marksStatus = 'submitted'; expect((await state.saveGrade(snapshot, 's1', draft, { scope: state.scope })).saved).toBe(false);
	expect(requests).toHaveLength(0);
});
test('existing result identity and captured revisions survive a newer read; failed retry keeps request ID', async () => {
	const { state, grading } = owner(); const snapshot = structuredClone(server);
	grading.review!.assessment.marksRevision = 8;
	failWrite = true; await state.saveGrade(snapshot, 's1', draft, { scope: state.scope });
	failWrite = false; expect((await state.saveGrade(snapshot, 's1', draft, { scope: state.scope })).saved).toBe(true);
	expect(requests[0]).toMatchObject({ id: 'existing-id', expectedRevision: 3, expectedGradingRevision: 2, studentId: 's1', score: 12 });
	expect(requests[1]?.requestId).toBe(requests[0]?.requestId);
});
test('confirmed save and refresh failure remain distinct without optimistic rollback', async () => {
	const { state, grading } = owner(); failRead = true;
	const result = await state.saveGrade(structuredClone(server), 's1', draft, { scope: state.scope });
	expect(result).toMatchObject({ saved: true, review: null });
	expect(server.results[0]?.score).toBe(12); expect(grading.review?.results[0]?.score).toBe(10);
	expect(errors).toContain('mutation.savedRefreshFailed');
});
test('pending exclusion and a changed scope prevent late writes from seeding the reopened assessment', async () => {
	const { state, grading } = owner(); let finish!: () => void; wait = new Promise(resolve => { finish = resolve; });
	const snapshot = structuredClone(server); const scope = state.scope;
	const saving = state.saveGrade(snapshot, 's1', draft, { scope });
	expect((await state.saveGrade(snapshot, 's2', draft, { scope })).saved).toBe(false);
	academic.scopeGeneration++; grading.adopt('class', { ...structuredClone(server), students: [] });
	finish(); expect((await saving).saved).toBe(true); expect(grading.review?.students).toEqual([]); expect(requests).toHaveLength(1);
});
test('clearing on close/reopen invalidates old reads even in the same scope', async () => {
	const { state, grading } = owner(); let finish!: () => void; readWait = new Promise(resolve => { finish = resolve; });
	const loading = state.loadMarks('assessment'); grading.clear(); grading.adopt('class', { ...structuredClone(server), students: [] }); finish();
	expect(await loading).toBeNull(); expect(grading.review?.students).toEqual([]);
});
test('aborted tab query never assigns review before checking the signal', async () => {
	const grading = new EvaluationGradingTabState(); let finish!: () => void; readWait = new Promise(resolve => { finish = resolve; });
	const controller = new AbortController();
	const loading = grading.query('class')(new URL('https://school.test/classes/class/evaluations/assessment/grading'), { signal: controller.signal });
	await Promise.resolve(); controller.abort(); finish();
	await expect(loading).rejects.toBeInstanceOf(DOMException); expect(grading.review).toBeNull(); expect(grading.slice).toBeNull();
});
test('corrections capture revision, reason, target and stable retry identity; unavailable targets never fall back', async () => {
	server.assessment.marksStatus = 'submitted'; server.allowedActions.requestCorrection = true;
	const { state } = owner(); const snapshot = structuredClone(server);
	const details = { snapshot, scope: state.scope, reason: 'Original paper checked', changes: [{ resultId: 'existing-id', proposed: { score: 14, designation: 'scored' as const, notes: null } }] };
	failWrite = true; expect(await state.reviewMarks('request', details)).toBe(false); failWrite = false;
	expect(await state.reviewMarks('request', details)).toBe(true);
	expect(requests[0]).toMatchObject({ assessmentId: 'assessment', expectedRevision: 3, reason: details.reason, changes: details.changes });
	expect(requests[0]?.requestId).toBe(requests[1]?.requestId);
	expect(await state.reviewMarks('approve', { snapshot, correctionId: 'missing' })).toBe(false);
	expect(requests).toHaveLength(2);
});

test('newer grading reads win even when two reads begin in the same assessment scope', async () => {
	const { state, grading } = owner(); let finish!: () => void; readWait = new Promise(resolve => { finish = resolve; });
	const older = state.loadMarks('assessment');
	server.students = []; readWait = undefined;
	expect((await state.loadMarks('assessment'))?.students).toEqual([]);
	finish(); expect(await older).toBeNull(); expect(grading.review?.students).toEqual([]);
});
