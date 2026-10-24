import { writable } from 'svelte/store';
import { EnrollmentRequest } from '../../../src/lib/subjects/enrollment-request';

export const academicContext = $state({ schoolScopeId: 'school', yearId: 'year', schools: [{ id: 'school', timeZone: 'America/Toronto' }] });
export const controls = $state({ allowed: !new URL(location.href).searchParams.has('denied'), fail: false, requests: [] as unknown[] });
export const hasPermission = () => controls.allowed;
const snapshot = () => ({ url: new URL(location.href), state: history.state ?? {}, params: { id: 'child' } });
export const page = writable(snapshot());
window.addEventListener('popstate', () => page.set(snapshot()));
export async function appGoto(href: string, options: { replaceState?: boolean; state?: object } = {}) {
  history[options.replaceState ? 'replaceState' : 'pushState'](options.state ?? {}, '', href);
  page.set(snapshot());
}
const request = new EnrollmentRequest();
const participation = $state({ studentId: 'child', periods: [{ id: 'term', academicYearId: 'year', name: 'Term 1', startDate: '2026-09-01', endDate: '2027-12-31' }, { id: 'future', academicYearId: 'year', name: 'Term 2', startDate: '2028-01-01', endDate: '2028-06-30' }], enrollments: [] as unknown[], placements: [{ id: 'placement', classGroupId: 'class', academicYearId: 'year', status: 'active' }], offerings: [{ id: 'music', subjectId: 'subject', classGroupId: 'class', name: 'Music', isOptional: true, isOffered: true, participationRevision: 3 }] });
if (new URL(location.href).searchParams.has('history')) {
  setTimeout(() => participation.enrollments.push({ id: 'existing', studentClassEnrollmentId: 'placement', classSubjectId: 'music', enrolledAt: '2026-10-23T16:42:17.000Z', endedAt: '2027-05-05T16:12:00.000Z', source: 'explicit', scope: 'annual', periods: [], revision: 0 }), 200);
}
const state = $state({ slice: { studentId: 'child', participation }, async manageParticipation(input: Parameters<EnrollmentRequest['prepare']>[0]) {
  const command = request.prepare(input);
  controls.requests.push(command);
  if (controls.fail) { controls.fail = false; return false; }
  const operation = command.operations[0];
  const index = participation.enrollments.findIndex(row => (row as { studentClassEnrollmentId: string }).studentClassEnrollmentId === operation.studentClassEnrollmentId);
  if (index >= 0) participation.enrollments.splice(index, 1);
  if (operation.selection.scope !== 'none') participation.enrollments.push({ id: 'choice', ...operation, scope: operation.selection.scope, periods: operation.selection.scope === 'periods' ? operation.selection.periodIds.map(periodId => ({ periodId })) : [], enrolledAt: new Date().toISOString(), source: 'explicit', revision: 0 });
  request.complete();
  return true;
} });
export const getStudentEnrollmentsTabState = () => state;
