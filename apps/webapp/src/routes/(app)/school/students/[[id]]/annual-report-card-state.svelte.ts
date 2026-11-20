import type { AnnualReportResult, AnnualReportReview } from '$lib/api/annual-report-cards-data';
import type { StudentDetailHost } from '../lib/student-detail-host';
import { academicContext } from '$lib/academic/context.svelte';
import { annualReportPublicationReady, loadStudentYearReportResults } from '$lib/api/annual-report-cards-data';
import { requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { nowIso } from '$lib/date/format';
import { lang, t } from '$lib/i18n';
import { hasAnyPermission } from '$lib/permissions';
import { get } from 'svelte/store';
import { runStudentRouteMutation } from '../lib/student-route-mutation';

export interface AnnualReportSelection {
  studentId: string;
  targetId: string;
  sourceIds: string[];
  weights: Record<string, number>;
}

export class AnnualReportCardState {
  results = $state<AnnualReportResult[]>([]);
  studentId = $state('');
  private generation = 0;
  private requestVersion = 0;
  private scope = $state('');
  constructor(private readonly getPage: () => StudentDetailHost) {}
  private identity(studentId: string) { return JSON.stringify([this.generation, authSession.authUserId, authSession.schoolId, academicContext.yearId, studentId, authSession.grants]); }
  seed(studentId: string, results: AnnualReportResult[]) {
    this.requestVersion++;
    this.studentId = studentId;
    this.scope = this.identity(studentId);
    this.results = results;
  }

  isCurrent(studentId: string) { return this.studentId === studentId && this.scope === this.identity(studentId); }
  private async reload(studentId: string) {
    if (!this.isCurrent(studentId))
      return;
    await this.refresh(studentId);
  }

  clear() {
    this.generation++;
    this.requestVersion++;
    this.scope = '';
    this.results = [];
    this.studentId = '';
  }

  canAccess(studentId: string) {
    return hasAnyPermission(['REPORT_CARD_GENERATE', 'REPORT_CARD_PUBLISH'], { classId: this.getPage().findStudent(studentId)?.classId });
  }

  get periods() {
    return academicContext.periods.filter(period => period.academicYearId === academicContext.yearId)
      .toSorted((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));
  }

  async refresh(studentId: string, signal?: AbortSignal) {
    if (!hasAnyPermission(['REPORT_CARD_READ', 'REPORT_CARD_GENERATE', 'REPORT_CARD_PUBLISH'], { studentId, classId: this.getPage().findStudent(studentId)?.classId })) {
      this.clear();
      return;
    }
    const captured = this.identity(studentId);
    const version = ++this.requestVersion;
    const client = getBrowserSchoolClient();
    const results = await loadStudentYearReportResults(client, studentId, this.periods.map(period => period.id));
    signal?.throwIfAborted();
    if (version !== this.requestVersion || captured !== this.identity(studentId))
      throw new DOMException('Context changed', 'AbortError');
    this.seed(studentId, results);
  }

  async generate(selection: AnnualReportSelection) {
    if (!this.isCurrent(selection.studentId))
      return false;
    const response = await runStudentRouteMutation({
      request: () => getBrowserSchoolClient().commands.generateReportCardResult({
        id: this.results.find(result => result.periodId === selection.targetId)?.id ?? crypto.randomUUID(),
        studentId: selection.studentId,
        periodId: selection.targetId,
        generatedAt: nowIso(),
        aggregation: { source: 'report_cards', sourcePeriodIds: selection.sourceIds, periodWeightsByPeriodId: selection.weights },
      }),
      versionKeys: ['reportCards', 'students'],
      successMessage: get(t)('reportCards.annual.generated'),
      onSuccess: () => this.reload(selection.studentId),
    });
    return response !== null;
  }

  async publish(result: AnnualReportReview) {
    if (!this.isCurrent(result.studentId))
      return false;
    const response = await runStudentRouteMutation({
      request: () => getBrowserSchoolClient().commands.publishReportCardResult({
        id: result.id,
        studentId: result.studentId,
        periodId: result.periodId,
        publishedAt: nowIso(),
        reviewedDraftVersion: result.version,
        reviewedGradingRevision: result.gradingPolicyRevision!,
        reviewedReportConfigurationRevision: result.reportConfigurationRevision,
      }),
      versionKeys: ['reportCards', 'students', 'documents'],
      successMessage: get(t)('reportCards.annual.published'),
      onSuccess: () => this.reload(result.studentId),
    });
    return response !== null;
  }

  readyForPublication(result: AnnualReportReview) { return this.isCurrent(result.studentId) && annualReportPublicationReady(this.periods, this.results, result); }

  async issue(result: AnnualReportReview) {
    if (!this.readyForPublication(result) || result.status !== 'published')
      return false;
    const response = await requestDocumentIssuanceMutation({
      templateKey: 'annual-report-card.v1',
      sourceId: result.id,
      studentId: result.studentId,
      classGroupId: result.classGroupId,
      academicYearId: academicContext.yearId,
      locale: get(lang),
      successMessage: get(t)('documents.toastRequested'),
    });
    return response !== null && response.status !== 'failed';
  }
}
