import type { components } from '../../../src/lib/api/schema';
import type { Student } from '../../../src/lib/types/school';
import { writable } from 'svelte/store';
import { ListSelectionState } from '../../../src/lib/list/list-selection-state.svelte';
import { filterStudentList } from '../../../src/routes/(app)/school/students/lib/student-list-filters';

type Data = components['schemas']['StudentSubjectEnrollmentsResponse'];
type Command = components['schemas']['ManageStudentSubjectEnrollmentsCommand'];
const classes = [{ id: 'class', schoolId: 'school', academicYearId: 'year', gradeLevelId: 'level', name: 'Class A', level: 'Level', studentCount: 2 }, { id: 'other', schoolId: 'school', academicYearId: 'year', gradeLevelId: 'level', name: 'Class B', level: 'Level', studentCount: 1 }];
export const academicContext = $state({ schoolScopeId: 'school', yearId: 'year', schools: [{ id: 'school', timeZone: 'America/Toronto' }], classes, hierarchy: [{ level: 'Level', classes }], years: [{ id: 'year', label: '2026–2027' }], periods: [], selectablePeriodsForYear: [], periodsForYear: [], periodId: '' });
export const controls = $state({ allowed: !new URL(location.href).searchParams.has('denied'), fail: false, conflict: false, requests: [] as Command[], messages: [] as string[] });
export const authSession = $state({ schoolId: 'school', subjectId: 'staff', grants: [], user: null });
export const hasPermission = () => controls.allowed;
export const hasAnyPermission = () => controls.allowed;
export const toast = { success: (message: string) => controls.messages.push(message), error: (message: string) => controls.messages.push(message) };
export const entityVersions = { bump: (_key: string) => {} };
const snapshot = () => ({ url: new URL(location.href), state: history.state ?? {}, params: { id: 'child', classId: 'class' } });
export const page = writable(snapshot());
window.addEventListener('popstate', () => page.set(snapshot()));
export const afterNavigate = () => {};
export const beforeNavigate = () => {};
export async function appGoto(href: string, options: { replaceState?: boolean; state?: object } = {}) {
  history[options.replaceState ? 'replaceState' : 'pushState'](options.state ?? {}, '', href);
  page.set(snapshot());
}
export const goto = appGoto;
export const appPath = (path: string) => path;
export const appHref = (path: string) => path;
const periods = [{ id: 'past', academicYearId: 'year', name: 'Completed term', startDate: '2020-01-01', endDate: '2020-06-30' }, { id: 'term', academicYearId: 'year', name: 'Term 1', startDate: '2026-09-01', endDate: '2035-12-31' }, { id: 'future', academicYearId: 'year', name: 'Term 2', startDate: '2036-01-01', endDate: '2036-06-30' }];
const offerings = $state(['music', 'art', 'dance'].map(id => ({ id, subjectId: `${id}-subject`, classGroupId: 'class', name: id[0]!.toUpperCase() + id.slice(1), isOptional: true, isOffered: true, participationRevision: 3 })));
const saved = $state<Data['enrollments']>([]);
function participation(studentId: string): Data {
  return $state.snapshot({ studentId, periods, enrollments: saved.filter(row => row.studentClassEnrollmentId === `placement-${studentId}`), placements: [{ id: `placement-${studentId}`, studentId, classGroupId: studentId === 'third' ? 'other' : 'class', academicYearId: 'year', status: 'active' }], offerings }) as unknown as Data;
}
export const getBrowserSchoolClient = () => ({ queries: { getStudentSubjectEnrollments: async ({ studentId }: { studentId: string }) => participation(studentId) }, commands: {
  manageStudentSubjectEnrollments: async (command: Command) => {
    controls.requests.push(JSON.parse(JSON.stringify(command)));
    if (controls.fail) { controls.fail = false; throw new Error('Please retry this save.'); }
    if (controls.conflict) { controls.conflict = false; offerings.forEach(row => ++row.participationRevision); throw { body: { code: 'SUBJECT_PARTICIPATION_REVISION_CONFLICT' } }; }
    for (const operation of command.operations) {
      const index = saved.findIndex(row => row.studentClassEnrollmentId === operation.studentClassEnrollmentId && row.classSubjectId === operation.classSubjectId);
      if (index >= 0) saved.splice(index, 1);
      if (operation.selection.scope !== 'none') saved.push({ id: crypto.randomUUID(), studentClassEnrollmentId: operation.studentClassEnrollmentId, classSubjectId: operation.classSubjectId, scope: operation.selection.scope, periods: operation.selection.scope === 'periods' ? operation.selection.periodIds.map(periodId => ({ periodId })) : [], enrolledAt: new Date().toISOString(), source: 'explicit', revision: 0 } as Data['enrollments'][number]);
      ++offerings.find(row => row.id === operation.classSubjectId)!.participationRevision;
    }
    return { enrollmentIds: ['saved'], revisions: Object.fromEntries(offerings.map(row => [row.id, row.participationRevision])) };
  },
} });
const detail = $state({ slice: { studentId: 'child', participation: participation('child') }, async invalidateIfStale() { this.slice.participation = participation('child'); } });
export const getStudentEnrollmentsTabState = () => detail;
const students: Student[] = ['child', 'second', 'third'].map((id, i) => ({ id, name: ['Ada Student', 'Ben Student', 'Cleo Student'][i]!, classId: i === 2 ? 'other' : 'class', enrollmentId: `placement-${id}`, initials: ['AS', 'BS', 'CS'][i]!, email: '', birthdate: '', guardian: '', attendance: null, average: 12, status: 'active' }));
function filters() {
  const values = $state({ q: '', class: 'all', status: 'all', photoReview: 'all', sort: 'roster' as const, sortDir: 'asc' as const });
  return { values, ready: true, hydrate() {}, patch(input: Partial<typeof values>) { Object.assign(values, input); }, patchImmediate(input: Partial<typeof values>) { Object.assign(values, input); }, syncNow() {}, scheduleSync() {} };
}
const school = $state({ students, fullRosterStudents: [] as Student[], totalStudents: 3, classes, hierarchy: academicContext.hierarchy, selection: new ListSelectionState<Student>(), filters: filters(), loadingFullRoster: false, listLoading: false, listLoadingMore: false, filterVisible(rows: Student[]) { return filterStudentList(rows, this.filters.values); }, async loadMore() {}, async loadFullRoster() { this.fullRosterStudents = this.students; }, async refreshList() {}, async invalidateIfStale() {} });
export const getStudentsPageState = () => school;
export const SCHOOL_STUDENTS_PAGE_SIZE = 25;
const roster = $state({ students: students.slice(0, 2), currentClass: classes[0], selection: new ListSelectionState<Student>(), filters: filters(), get hierarchy() { return academicContext.hierarchy; }, get visibleStudents() { return filterStudentList(this.students, this.filters.values); }, async invalidateIfStale() {} });
export const getClassStudentsPageState = () => roster;
export function switchYear() { academicContext.yearId = 'other-year'; school.selection.clearSelection(); roster.selection.clearSelection(); }
