import type { GradeScale, ReportCardResult } from '$lib/types/report-cards';
import type { StudentDetailHost } from '../../../lib/student-detail-host';
import type { PageQueryRequest } from '../../../lib/student-page-status';
import { academicContext } from '$lib/academic/context.svelte';
import { requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
import { writeHomeroomReportCommentMutation, writeReportSectionCommentsMutation } from '$lib/api/mutations/student-ops.mutations';
import { loadClassReportCardResultsData } from '$lib/api/report-cards-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { studentDetailIdFromPathname } from '$lib/api/student-detail-url';
import { nowIso } from '$lib/date/format';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { VersionedRouteQuery } from '$lib/navigation/versioned-route-query';
import { getContext, setContext } from 'svelte';
import { resolveStudentPageLoad } from '../../../lib/student-page-status';
import { runStudentRouteMutation } from '../../../lib/student-route-mutation';
import { AnnualReportCardState } from '../../annual-report-card-state.svelte';

const STUDENT_REPORT_CARD_TAB_KEY = Symbol('student-report-card-tab');

export interface StudentReportCardTabSlice {
  studentId: string;
  reportCardResults: ReportCardResult[];
  gradeScales: GradeScale[];
}

export type StudentReportCardTabSeed = Partial<Omit<StudentReportCardTabSlice, 'studentId'>>;

function emptySlice(studentId: string): StudentReportCardTabSlice {
  return {
    studentId,
    reportCardResults: [],
    gradeScales: [],
  };
}

export class StudentReportCardTabState {
  private readonly versionedQuery = new VersionedRouteQuery(new RouteVersionSnapshot(['students', 'reportCards', 'evaluations', 'subjects', 'documents']));
  invalidateIfStale = () => this.versionedQuery.invalidateIfStale();

  performWriteReportSectionComments = (...args: Parameters<typeof writeReportSectionCommentsMutation>) => writeReportSectionCommentsMutation(...args);

  performRequestDocumentIssuance = (...args: Parameters<typeof requestDocumentIssuanceMutation>) => requestDocumentIssuanceMutation(...args);

  performWriteHomeroomReportComment = (...args: Parameters<typeof writeHomeroomReportCommentMutation>) => writeHomeroomReportCommentMutation(...args);

  slice = $state<StudentReportCardTabSlice | null>(null);

  constructor(private readonly getPage: () => StudentDetailHost, readonly annual = new AnnualReportCardState(getPage)) {}

  clear() {
    this.versionedQuery.clear();
    this.annual.clear();
    this.slice = null;
  }

  seed(studentId: string, data: StudentReportCardTabSeed) {
    if (!this.slice || this.slice.studentId !== studentId) {
      this.slice = { ...emptySlice(studentId), ...data, studentId };
      return;
    }
    this.slice = { ...this.slice, ...data, studentId };
  }

  private forStudent(studentId: string) {
    return this.slice?.studentId === studentId ? this.slice : null;
  }

  reportCardResultsFor(studentId: string) {
    return this.forStudent(studentId)?.reportCardResults ?? [];
  }

  reportCardScalesFor(studentId: string) {
    return this.forStudent(studentId)?.gradeScales ?? [];
  }

  async loadCatalog(studentId: string, signal?: AbortSignal) {
 signal?.throwIfAborted();
  this.seed(studentId, {});
  }

  async refreshResults(studentId: string, signal?: AbortSignal) {
    const page = this.getPage();
    const student = page.findStudent(studentId);
    const slice = this.forStudent(studentId);
    if (!student || !slice || !academicContext.periodId) {
      this.seed(studentId, { reportCardResults: [] });
      return;
    }

    const results = await loadClassReportCardResultsData(
      getBrowserSchoolClient(),
      student.classId,
      academicContext.periodId,
    );
    signal?.throwIfAborted();
    this.seed(studentId, {
      reportCardResults: results.filter(result => result.studentId === studentId),
    });
  }

  query() {
    return this.versionedQuery.track((url: URL, request?: PageQueryRequest) => resolveStudentPageLoad(url, {
      empty: () => ({}),
      load: async (signal) => {
        const studentId = studentDetailIdFromPathname(url.pathname);
        const page = this.getPage();
        const student = studentId ? page.findStudent(studentId) : undefined;
        if (!studentId || !student) {
          return {};
        }

        await Promise.all([this.loadCatalog(studentId, signal), this.annual.refresh(studentId, signal)]);
        await this.refreshResults(studentId, signal);
        return {};
      },
      hasItems: () => true,
    }, request));
  }

  async generateReportCard(studentId: string): Promise<boolean> {
    const page = this.getPage();
    const student = page.findStudent(studentId);
    const slice = this.forStudent(studentId);
    const periodId = academicContext.periodId;
    if (!periodId || !student || !slice)
      return false;

    const client = getBrowserSchoolClient();
    const id = `rcr-${studentId}-${periodId}`;

    const result = await runStudentRouteMutation({
      request: async () => {
        await client.commands.generateReportCardResult({
          id,
          studentId,
          periodId,
          generatedAt: nowIso(),
        });
        return true;
      },
      errorMessage: 'Impossible de générer le bulletin.',
      versionKeys: ['students', 'reportCards'],
      onSuccess: async () => {
        await this.refreshResults(studentId);
      },
    });
    return result !== null;
  }

  async publishReportCard(input: {
    resultId: string;
    studentId: string;
    periodId: string;
  }): Promise<boolean> {
    const client = getBrowserSchoolClient();
    const existing = this.forStudent(input.studentId)?.reportCardResults.find(r => r.id === input.resultId);
    if (!existing || existing.revisedDraft)
      return false;

    const result = await runStudentRouteMutation({
      request: () => client.commands.publishReportCardResult({
        id: input.resultId,
        studentId: input.studentId,
        periodId: input.periodId,
        publishedAt: nowIso(),
        reviewedDraftVersion: existing.version!,
        reviewedGradingRevision: existing.gradingPolicyRevision!,
        reviewedReportConfigurationRevision: existing.reportConfigurationRevision,
      }),
      versionKeys: ['students', 'reportCards'],
      onSuccess: async () => {
        await this.refreshResults(input.studentId);
      },
    });
    return result !== null;
  }
}

export function setStudentReportCardTabState(state: StudentReportCardTabState) {
  setContext(STUDENT_REPORT_CARD_TAB_KEY, state);
}

export function getStudentReportCardTabState() {
  return getContext<StudentReportCardTabState>(STUDENT_REPORT_CARD_TAB_KEY);
}
