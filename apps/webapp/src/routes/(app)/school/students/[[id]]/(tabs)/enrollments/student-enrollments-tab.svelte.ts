import type { components } from '$lib/api/schema';
import type { StudentEnrollmentHistoryItem } from '$lib/types/school';
import type { StudentDetailHost } from '../../../lib/student-detail-host';
import type { PageQueryRequest } from '../../../lib/student-page-status';
import { academicContext } from '$lib/academic/context.svelte';
import { listAllEntityPages } from '$lib/api/entity-list-filters';
import { requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { studentDetailIdFromPathname } from '$lib/api/student-detail-url';
import { loadStudentEnrollmentHistory } from '$lib/api/student-drawer-data';
import { authSession } from '$lib/auth/session.svelte';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { VersionedRouteQuery } from '$lib/navigation/versioned-route-query';
import { hasPermission } from '$lib/permissions';
import { getContext, setContext } from 'svelte';
import { SvelteDate, SvelteSet } from 'svelte/reactivity';
import { resolveStudentPageLoad } from '../../../lib/student-page-status';
import { runStudentRouteMutation } from '../../../lib/student-route-mutation';

const STUDENT_ENROLLMENTS_TAB_KEY = Symbol('student-enrollments-tab');
export interface StudentEnrollmentsTabSlice {
  studentId: string;
  enrollments: StudentEnrollmentHistoryItem[];
  participation?: components['schemas']['StudentSubjectEnrollmentsResponse'];
}
export type StudentEnrollmentsTabSeed = Partial<Omit<StudentEnrollmentsTabSlice, 'studentId'>>;
function emptySlice(studentId: string): StudentEnrollmentsTabSlice {
  return { studentId, enrollments: [] };
}
export class StudentEnrollmentsTabState {
  private readonly queries = Object.fromEntries(['history', 'subjects'].map(section => [section, new VersionedRouteQuery(new RouteVersionSnapshot(['students', 'enrollments', 'subjectEnrollments', 'subjects', 'attendance', 'evaluations', 'reportCards', 'planning']))])) as Record<'history' | 'subjects', VersionedRouteQuery>;
  invalidateIfStale = async () => { await Promise.all(Object.values(this.queries).map(query => query.invalidateIfStale())); };
  private generation = 0;
  private identity(studentId: string) { return JSON.stringify([this.generation, authSession.authUserId, authSession.schoolId, academicContext.yearId, studentId, authSession.grants]); }
  performRequestDocumentIssuance = (...args: Parameters<typeof requestDocumentIssuanceMutation>) => requestDocumentIssuanceMutation(...args);
  slice = $state<StudentEnrollmentsTabSlice | null>(null);
  constructor(private readonly getPage: () => StudentDetailHost) {
  }

  clear() {
    this.generation++;
    this.progressionClasses = [];
    Object.values(this.queries).forEach(query => query.clear());
    this.slice = null;
  }

  seed(studentId: string, data: StudentEnrollmentsTabSeed) {
    if (!this.slice || this.slice.studentId !== studentId) {
      this.slice = { ...emptySlice(studentId), ...data, studentId };
      return;
    }
    this.slice = { ...this.slice, ...data, studentId };
  }

  private forStudent(studentId: string) {
    return this.slice?.studentId === studentId ? this.slice : null;
  }

  enrollmentsFor(studentId: string) {
    return this.forStudent(studentId)?.enrollments ?? [];
  }

  query(section: 'history' | 'subjects' = 'history') {
    return this.queries[section].track((url: URL, request?: PageQueryRequest) => {
      const id = studentDetailIdFromPathname(url.pathname);
      if (!hasPermission('ENROLLMENT_READ', { studentId: id ?? undefined, classId: id ? this.getPage().findStudent(id)?.classId : undefined }))
return Promise.resolve({ status: 'denied' as const });
      return resolveStudentPageLoad(url, {
      empty: () => ({}),
      load: async (signal) => {
        const studentId = studentDetailIdFromPathname(url.pathname);
        if (!studentId) {
          return {};
        }
        const captured = this.identity(studentId);
        const student = this.getPage().findStudent(studentId);
        if (!hasPermission('ENROLLMENT_READ', { studentId, classId: student?.classId }))
return { denied: true };
        const data = section === 'history' ? { enrollments: await loadStudentEnrollmentHistory(getBrowserSchoolClient(), studentId) } : { participation: await getBrowserSchoolClient().queries.getStudentSubjectEnrollments({ studentId, academicYearId: academicContext.yearId || undefined }) };
        signal.throwIfAborted();
        if (captured !== this.identity(studentId))
throw new DOMException('Context changed', 'AbortError');
        this.seed(studentId, data);
        if ('enrollments' in data) {
          const active = data.enrollments?.find(row => row.academicYearId === academicContext.yearId && row.status === 'active');
          if (active)
this.getPage().patchStudent(studentId, { classId: active.classGroupId, enrollmentId: active.id });
        }
        return {};
      },
      hasItems: () => true,
    }, request);
    });
  }

  progressionClasses = $state<components['schemas']['ClassGroup'][]>([]);
  async loadProgressionClasses(studentId: string) {
    const captured = this.identity(studentId);
    const schoolId = authSession.schoolId;
    this.progressionClasses = [];
    const rows = await listAllEntityPages(query => getBrowserSchoolClient().entities.classGroups.list(query), { baseQuery: { schoolId: schoolId ?? '' } });
    if (captured === this.identity(studentId))
      this.progressionClasses = rows;
  }

  async updateProgression(input: {
    enrollmentId: string;
    action: 'complete' | 'withdraw' | 'graduate' | 'promote' | 'decision';
    decision: 'promoted' | 'retained' | 'graduated';
    effectiveAt: string;
    notes?: string;
    nextClassGroupId?: string;
  }) {
    const client = getBrowserSchoolClient();
    const result = await runStudentRouteMutation({
      request: () => {
        if (input.action === 'decision')
          return client.commands.recordProgressionDecision({ enrollmentId: input.enrollmentId, decision: input.decision, notes: input.notes || undefined });
        if (input.action === 'graduate')
          return client.commands.graduateStudent({ enrollmentId: input.enrollmentId, effectiveAt: input.effectiveAt, notes: input.notes || undefined });
        if (input.action === 'promote')
          return client.commands.promoteStudent({ enrollmentId: input.enrollmentId, nextEnrollmentId: crypto.randomUUID(), nextClassGroupId: input.nextClassGroupId!, effectiveAt: input.effectiveAt, notes: input.notes || undefined });
        return client.commands.closeEnrollment({ enrollmentId: input.enrollmentId, endReason: input.action === 'withdraw' ? 'withdrawn' : 'completed', endedAt: input.effectiveAt });
      },
      versionKeys: ['students', 'enrollments', 'subjectEnrollments', 'subjects', 'attendance', 'evaluations', 'reportCards', 'planning'],
    });
    if (!result)
      return false;
    await this.invalidateIfStale();
    return true;
  }

  async previewTransfer(studentId: string, enrollmentId: string, nextClassGroupId: string) {
    const client = getBrowserSchoolClient();
    const [data, destination] = await Promise.all([
      client.queries.getStudentSubjectEnrollments({ studentId }),
      listAllEntityPages(query => client.entities.classSubjects.list(query), { baseQuery: { classGroupId: nextClassGroupId } }),
    ]);
    const now = new SvelteDate().toISOString();
    const choices = new SvelteSet(data.enrollments.filter(row => row.studentClassEnrollmentId === enrollmentId && !row.deletedAt && (!row.endedAt || row.endedAt > now) && (row.scope === 'annual' || row.periods.some(period => period.endsAt > now))).map(row => row.classSubjectId));
    return data.offerings.filter(row => choices.has(row.id) && row.isOptional && !destination.some(target => target.subjectId === row.subjectId && target.isOffered)).map(row => ({ subjectId: row.subjectId, name: row.name }));
  }

  async transferClass(input: {
    enrollmentId: string;
    studentId: string;
    nextClassGroupId: string;
    successMessage?: string;
    acknowledgedDroppedSubjectIds?: string[];
  }): Promise<boolean> {
    const page = this.getPage();
    const client = getBrowserSchoolClient();
    const previous = page.findStudent(input.studentId);
    const nextEnrollmentId = `enr-${input.studentId}-${crypto.randomUUID()}`;
    const result = await runStudentRouteMutation({
      request: () => client.commands.transferStudent({
        enrollmentId: input.enrollmentId,
        nextEnrollmentId,
        nextClassGroupId: input.nextClassGroupId,
        acknowledgedDroppedSubjectIds: input.acknowledgedDroppedSubjectIds,
        effectiveAt: new SvelteDate().toISOString(),
      }),
      successMessage: input.successMessage,
      versionKeys: ['students', 'enrollments', 'subjectEnrollments', 'subjects', 'attendance', 'evaluations', 'reportCards', 'planning'],
      apply: () => {
        page.patchStudent(input.studentId, {
          classId: input.nextClassGroupId,
          enrollmentId: nextEnrollmentId,
        });
      },
      rollback: () => {
        if (previous) {
          page.patchStudent(input.studentId, previous);
        }
      },
    });
    return result !== null;
  }
}
export function setStudentEnrollmentsTabState(state: StudentEnrollmentsTabState) {
  setContext(STUDENT_ENROLLMENTS_TAB_KEY, state);
}
export function getStudentEnrollmentsTabState() {
  return getContext<StudentEnrollmentsTabState>(STUDENT_ENROLLMENTS_TAB_KEY);
}
