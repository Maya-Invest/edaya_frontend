import type { PermissionCode } from '$lib/auth/types';
import type { PermissionContext } from '$lib/permission-check';
import { mapClassEvaluations } from '$lib/api/assessments-data';
import { checkPermission, checkAnyPermission } from '$lib/permission-check';

const subject = { id: 'math-a', classId: 'class-a', name: 'Math', teacher: '', color: 'mint', description: '', categoryId: '', category: '', hoursPerWeek: null };
const evaluation = mapClassEvaluations('class-a', {
 assessmentsRaw: [{ id: 'assessment-a', classGroupId: 'class-a', classSubjectId: 'math-a', periodId: 'period-a', title: 'Math quiz', kind: 'quiz', attachments: [], marksStatus: 'draft', marksRevision: 0, marksReview: { rosterStudentIds: [], markEditorSubjectIds: {}, editedBySubjectIds: [], history: [] }, maxScore: 20, coefficient: 1, startsAt: '2026-10-17T10:00:00Z', endsAt: '2026-10-17T11:00:00Z' }],
 classSubjectsRaw: [],
subjectsRaw: [],
enrollmentsRaw: [],
classSize: 2,
 resultsRaw: [{ id: 'm1', assessmentId: 'assessment-a', studentId: 's1', score: 18, designation: 'scored', revision: 0 }, { id: 'm2', assessmentId: 'assessment-a', studentId: 's2', score: 14, designation: 'scored', revision: 0 }],
})[0];
export const state = $state({ mode: 'setup', evaluation: { ...evaluation, marksAvailable: false }, requests: [] as string[] });
export function setMode(mode: string) {
state.mode = mode;
state.evaluation.marksAvailable = mode === 'marker';
}
function grants() {
return [{ permission: (state.mode === 'marker' ? 'GRADE_READ' : 'ASSESSMENT_MANAGE') as PermissionCode, source: 'manual' as const, scopes: [{ kind: 'class_subject' as const, classGroupId: 'class-a', classSubjectId: state.mode === 'other' ? 'french-a' : 'math-a' }] }, ...(state.mode === 'marker' ? [{ permission: 'GRADE_MANAGE' as const, source: 'manual' as const, scopes: [{ kind: 'class_group' as const, classGroupId: 'class-a' }] }] : [])];
}
export const hasPermission = (permission: PermissionCode, ctx?: PermissionContext) => checkPermission(grants(), permission, ctx);
export const hasAnyPermission = (permissions: readonly PermissionCode[], ctx?: PermissionContext) => checkAnyPermission(grants(), permissions, ctx);
export const academicContext = $state({ schools: [{ id: 'school-a', timeZone: 'UTC' }], yearId: 'year-a', periodId: 'period-a', selectablePeriodsForYear: [], shellReady: true, period: null, setPeriod() {} });
export function getEvaluationsPageState() {
return { evaluationsFor: () => [state.evaluation], subjectsFor: () => [subject], async deleteEvaluation() {
state.requests.push('delete');
return true;
}, async updateEvaluation() {
state.requests.push('update');
return true;
}, async createEvaluation() {
state.requests.push('create');
return 'new-assessment';
} };
}
