import type { AnnualReportResult } from '$lib/api/annual-report-cards-data';
import type { StudentDetailHost } from '../lib/student-detail-host';
import { academicContext } from '$lib/academic/context.svelte';
import { loadStudentYearReportResults } from '$lib/api/annual-report-cards-data';
import { requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
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
  constructor(private readonly getPage: () => StudentDetailHost) {}
  clear() {
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
    if (!this.canAccess(studentId)) {
      this.clear();
      return;
    }
    const client = getBrowserSchoolClient();
    const results = await loadStudentYearReportResults(client, studentId, this.periods.map(period => period.id));
    signal?.throwIfAborted();
    this.studentId = studentId;
    this.results = results;
  }

  async generate(selection: AnnualReportSelection) {
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
      onSuccess: () => this.refresh(selection.studentId),
    });
    return response !== null;
  }

  async publish(result: AnnualReportResult) {
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
      onSuccess: () => this.refresh(result.studentId),
    });
    return response !== null;
  }

  async issue(result: AnnualReportResult) {
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
