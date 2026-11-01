import type { components } from '../../../src/lib/api/schema';
import { writable } from 'svelte/store';
import { marksReview } from './data';
const query = new URL(location.href).searchParams;
export const academicContext = $state({ schoolScopeId: 'school', yearId: 'year', scopeGeneration: 0 });
export const authSession = $state({ userId: 'staff' });
export const controls = $state({ allowed: !query.has('denied'), failStudent: query.get('fail-student'), failRead: query.has('fail-read'), failRefresh: query.has('fail-refresh'), requests: [] as Array<Record<string, unknown>> });
export const hasPermission = () => controls.allowed;
export const server = marksReview();
if (query.has('class-roster')) {
 server.students = Array.from({ length: 30 }, (_, index) => ({ id: `s${index + 1}`, firstName: ['Amina', 'Binta', 'Cheikh', 'Diarra', 'Fatou', 'Ibrahima'][index % 6]!, lastName: `Student ${String(index + 1).padStart(2, '0')}` }));
 server.assessment.marksReview.rosterStudentIds = server.students.map(row => row.id);
 server.missingStudentIds = server.students.slice(1).map(row => row.id);
}
if (query.get('taskPanel') === 'correction' || query.has('submitted')) { server.assessment.marksStatus = 'submitted'; server.allowedActions.requestCorrection = controls.allowed; }
if (query.has('mention')) server.gradingPolicy!.mode = 'mention-first';
function snapshot() { return { url: new URL(location.href), state: history.state ?? {}, params: { classId: 'class', id: 'assessment' } }; }
export const page = writable(snapshot());
window.addEventListener('popstate', () => page.set(snapshot()));
export async function appGoto(href: string, options: { replaceState?: boolean; state?: object } = {}) { history[options.replaceState ? 'replaceState' : 'pushState'](options.state ?? {}, '', href); page.set(snapshot()); }
export function appPath(path: string, params: Record<string, string> = {}) { return path.replace('/(app)', '').replace(/\[\[?(\w+)\]?\]/g, (_, key) => encodeURIComponent(params[key] ?? '')); }
export const getBrowserSchoolClient = () => ({
	queries: { getAssessmentMarksReview: async () => { await new Promise(resolve => setTimeout(resolve, 100)); if (controls.failRead) throw new Error('Fixture read failure'); if (controls.failRefresh && controls.requests.length) { controls.failRefresh = false; throw new Error('Fixture refresh failure'); } return structuredClone(server); } },
	commands: {
		recordAssessmentResult: async (input: components['schemas']['RecordAssessmentResultCommand']) => {
			controls.requests.push(input); await new Promise(resolve => setTimeout(resolve, 300));
			if (controls.failStudent === input.studentId) { controls.failStudent = null; throw new Error('Fixture write failure'); }
			if (input.expectedRevision !== server.assessment.marksRevision) throw new Error('Revision conflict');
			const previous = server.results.find(row => row.studentId === input.studentId);
			const result: components['schemas']['AssessmentResult'] = { ...previous, ...input, revision: (previous?.revision ?? 0) + 1, originalEntry: input.mentionId ? { kind: 'mention', intervalId: input.mentionId, code: 'A', label: 'Pass', points: 4, policyRevision: 2 } : input.score != null ? { kind: 'numeric', value: input.score, maximum: 20 } : undefined };
			server.results = [...server.results.filter(row => row.id !== result.id), result]; server.assessment.marksRevision++;
			return result;
		},
		requestAssessmentMarksCorrection: async (input: components['schemas']['RequestAssessmentMarksCorrectionCommand']) => {
            controls.requests.push(input); await new Promise(resolve => setTimeout(resolve, 300));
            if (input.expectedRevision !== server.assessment.marksRevision) throw new Error('Revision conflict');
            const changes = input.changes.map(change => { const result = server.results.find(row => row.id === change.resultId)!; return { ...change, studentId: result.studentId, revision: result.revision, before: { score: result.score ?? null, designation: result.designation ?? 'scored' as const, notes: result.notes ?? null } }; });
            const createdAt = '2026-10-25T15:37:00Z';
            server.corrections.push({ id: 'correction', schoolId: 'school', assessmentId: 'assessment', status: 'pending', version: 1, baseRevision: input.expectedRevision, baseGradingRevision: input.expectedGradingRevision, authorSubjectId: 'staff', reason: input.reason, changes, createdAt, revisions: [{ version: 1, reason: input.reason, changes, at: createdAt }], allowedActions: { approve: false, reject: false, withdraw: true } });
            server.allowedActions.requestCorrection = false;
            return {};
        },
	},
});
