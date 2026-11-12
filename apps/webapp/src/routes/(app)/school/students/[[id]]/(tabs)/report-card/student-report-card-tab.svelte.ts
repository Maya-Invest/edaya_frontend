import type { PageLoadMeta } from '$lib/page/load-state';
import type { GradeScale, ReportCardResult } from '$lib/types/report-cards';
import type { StudentDetailHost } from '../../../lib/student-detail-host';
import type { PageQueryRequest } from '../../../lib/student-page-status';
import { academicContext } from '$lib/academic/context.svelte';
import { requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
import { writeHomeroomReportCommentMutation, writeReportSectionCommentsMutation } from '$lib/api/mutations/student-ops.mutations';
import { loadStudentYearReportCardsData } from '$lib/api/report-cards-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { studentDetailIdFromPathname } from '$lib/api/student-detail-url';
import { authSession } from '$lib/auth/session.svelte';
import { nowIso } from '$lib/date/format';
import { t } from '$lib/i18n';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { VersionedRouteQuery } from '$lib/navigation/versioned-route-query';
import { hasPermission } from '$lib/permissions';
import { getContext, setContext } from 'svelte';
import { get } from 'svelte/store';
import { resolveStudentPageLoad } from '../../../lib/student-page-status';
import { runStudentRouteMutation } from '../../../lib/student-route-mutation';
import { AnnualReportCardState } from '../../annual-report-card-state.svelte';
import { reportPublicationBlocked } from './report-selection';

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

  private generation = 0;
  private requestVersion = 0;
  private currentUrl?: URL;
  private loadedIdentity = $state('');
  private loadStatus = $state<PageLoadMeta>({ status: 'loading' });
  constructor(private readonly getPage: () => StudentDetailHost, readonly annual = new AnnualReportCardState(getPage)) {}
  private identity(studentId: string) { return JSON.stringify([this.generation, authSession.authUserId, authSession.schoolId, academicContext.yearId, studentId, authSession.grants]); }
  cacheKey = (url: URL) => `${url.pathname}:${this.identity(studentDetailIdFromPathname(url.pathname) ?? '')}`;
  statusFor(studentId: string): PageLoadMeta {
    if (!hasPermission('REPORT_CARD_READ', { studentId, classId: this.getPage().findStudent(studentId)?.classId }))
      return { status: 'denied' };
    return this.loadedIdentity === this.identity(studentId) ? this.loadStatus : { status: 'loading' };
  }

  clear() {
    this.generation++;
    this.requestVersion++;
    this.currentUrl = undefined;
    this.loadedIdentity = '';
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
    return this.loadedIdentity === this.identity(studentId) && this.slice?.studentId === studentId ? this.slice : null;
  }

  reportCardResultsFor(studentId: string) {
    return this.forStudent(studentId)?.reportCardResults ?? [];
  }

  reportCardScalesFor(studentId: string) {
    return this.forStudent(studentId)?.gradeScales ?? [];
  }

  async refreshResults(studentId: string) {
    if (this.currentUrl && studentDetailIdFromPathname(this.currentUrl.pathname) === studentId)
      await this.query()(this.currentUrl);
  }

  query() {
    return this.versionedQuery.track(async (url: URL, request?: PageQueryRequest): Promise<PageLoadMeta> => {
      const studentId = studentDetailIdFromPathname(url.pathname);
      this.currentUrl = url;
      const version = ++this.requestVersion;
      const identity = studentId ? this.identity(studentId) : '';
      this.loadStatus = { status: this.loadedIdentity === identity && this.loadStatus.status === 'ready' ? 'refreshing' : 'loading' };
      this.loadedIdentity = identity;
      if (!studentId || !hasPermission('REPORT_CARD_READ', { studentId, classId: this.getPage().findStudent(studentId)?.classId })) {
        this.slice = null;
        this.annual.clear();
        return this.loadStatus = { status: 'denied' };
      }
      const result = await resolveStudentPageLoad(url, {
        empty: () => ({}),
        errorMessage: get(t)('dataState.errorDefault'),
        load: async (signal) => {
          const yearId = academicContext.yearId;
          const periods = academicContext.periods.filter(period => period.academicYearId === yearId);
          const data = await loadStudentYearReportCardsData(getBrowserSchoolClient(), studentId, yearId, periods.map(period => period.id));
          signal.throwIfAborted();
          if (version !== this.requestVersion || identity !== this.identity(studentId))
            throw new DOMException('Context changed', 'AbortError');
          this.seed(studentId, { reportCardResults: data.results });
          this.annual.seed(studentId, data.raw);
          return {};
        },
        hasItems: () => true,
      }, request);
      if (version === this.requestVersion && identity === this.identity(studentId) && !request?.signal.aborted)
        this.loadStatus = result;
      return result;
    });
  }

  async generateReportCard(studentId: string, periodId: string): Promise<boolean> {
    const page = this.getPage();
    const student = page.findStudent(studentId);
    const slice = this.forStudent(studentId);
    if (!periodId || !student || !slice || !academicContext.periods.some(period => period.id === periodId && period.academicYearId === academicContext.yearId) || !hasPermission('REPORT_CARD_GENERATE', { studentId, classId: slice.reportCardResults.find(result => result.academicPeriodId === periodId)?.classId || student.classId }))
      return false;

    const existing = slice.reportCardResults.find(result => result.academicPeriodId === periodId);
    if (existing?.status === 'published' && !hasPermission('REPORT_CARD_PUBLISH', { studentId, classId: existing.classId }))
      return false;
    const client = getBrowserSchoolClient();
    const id = slice.reportCardResults.find(result => result.academicPeriodId === periodId)?.id ?? crypto.randomUUID();

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
      errorMessage: get(t)('dataState.errorDefault'),
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
    reviewedRevision?: boolean;
  }): Promise<boolean> {
    const client = getBrowserSchoolClient();
    const existing = this.forStudent(input.studentId)?.reportCardResults.find(r => r.id === input.resultId);
    const reviewed = input.reviewedRevision ? existing?.revisedDraft : existing;
    if (!reviewed || reviewed.status === 'published' || reportPublicationBlocked(reviewed) || !hasPermission('REPORT_CARD_PUBLISH', { studentId: input.studentId, classId: reviewed.classId }))
      return false;

    const result = await runStudentRouteMutation({
      request: () => client.commands.publishReportCardResult({
        id: input.resultId,
        studentId: input.studentId,
        periodId: input.periodId,
        publishedAt: nowIso(),
        reviewedDraftVersion: reviewed.version!,
        reviewedGradingRevision: reviewed.gradingPolicyRevision!,
        reviewedReportConfigurationRevision: reviewed.reportConfigurationRevision,
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
