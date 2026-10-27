import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { GradeScale, ReportCardResult } from '$lib/types/report-cards';
import type { Student } from '$lib/types/school';
import type { ReportCardsPageSlice } from './lib/report-cards-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { requestDocumentIssuanceBatchMutation, requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
import { writeHomeroomReportCommentMutation, writeReportSectionCommentsMutation } from '$lib/api/mutations/student-ops.mutations';
import { loadClassReportCardResultsData } from '$lib/api/report-cards-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { nowIso } from '$lib/date/format';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import {
  emptyReportCardsSlice,
  reportCardDetailIdFromUrl,
  reportCardsClassIdFromUrl,
} from './lib/report-cards-helpers';
import { loadReportCardsSlice, queryReportCardsListPage } from './lib/report-cards-queries';
import { runReportCardsRouteMutation } from './lib/report-cards-route-mutation';

const REPORT_CARDS_VERSION_FAMILIES = ['reportCards', 'students', 'guardians', 'enrollments', 'subjects', 'evaluations'] as const satisfies readonly EntityVersionKey[];

const REPORT_CARDS_PAGE_STATE_KEY = Symbol('report-cards-page-state');

export type { ReportCardsPageSlice };

export class ReportCardsPageState {
  performWriteReportSectionComments = (...args: Parameters<typeof writeReportSectionCommentsMutation>) => writeReportSectionCommentsMutation(...args);

  performRequestDocumentIssuance = (...args: Parameters<typeof requestDocumentIssuanceMutation>) => requestDocumentIssuanceMutation(...args);

  performRequestDocumentIssuanceBatch = (...args: Parameters<typeof requestDocumentIssuanceBatchMutation>) => requestDocumentIssuanceBatchMutation(...args);

  performWriteHomeroomReportComment = (...args: Parameters<typeof writeHomeroomReportCommentMutation>) => writeHomeroomReportCommentMutation(...args);

  slice = $state<ReportCardsPageSlice | null>(null);

  private readonly versions = new RouteVersionSnapshot(REPORT_CARDS_VERSION_FAMILIES);

  constructor(private readonly getUrl: () => URL) {}

  applySlice(classId: string, data: Partial<Omit<ReportCardsPageSlice, 'classId'>>) {
    this.slice = { ...emptyReportCardsSlice(classId), ...data, classId };
    this.versions.markLoaded();
  }

  seed(classId: string, data: Partial<Omit<ReportCardsPageSlice, 'classId'>>) {
    this.applySlice(classId, data);
  }

  clear() {
    this.slice = null;
  }

  get selectedId() {
    return reportCardDetailIdFromUrl(this.getUrl());
  }

  get selected() {
    const classId = reportCardsClassIdFromUrl(this.getUrl());
    if (!classId) {
      return undefined;
    }
    return this.selectedResult(classId, this.selectedId);
  }

  studentsFor(classId: string): Student[] {
    return this.slice?.classId === classId ? this.slice.students : [];
  }

  resultsFor(classId: string): ReportCardResult[] {
    return this.slice?.classId === classId ? this.slice.results : [];
  }

  scalesFor(classId: string): GradeScale[] {
    return this.slice?.classId === classId ? this.slice.scales : [];
  }

  studentFor(studentId: string): Student | undefined {
    return this.slice?.students.find(student => student.id === studentId);
  }

  resultForStudent(studentId: string): ReportCardResult | undefined {
    return this.slice?.results.find(result => result.studentId === studentId);
  }

  selectedResult(classId: string, resultId?: string) {
    if (!resultId || this.slice?.classId !== classId) {
      return undefined;
    }
    return this.slice.results.find(result => result.id === resultId);
  }

  patchResult(id: string, patch: Partial<ReportCardResult>) {
    if (!this.slice) {
      return;
    }
    this.slice = {
      ...this.slice,
      results: this.slice.results.map(result =>
        result.id === id ? { ...result, ...patch } : result,
      ),
    };
  }

  replaceResults(results: ReportCardResult[]) {
    if (!this.slice) {
      return;
    }
    this.slice = {
      ...this.slice,
      results,
    };
  }

  queryListPage(classId: string) {
    return queryReportCardsListPage(classId, this);
  }

  async refreshSlice(classId: string) {
    const data = await loadReportCardsSlice(classId);
    this.applySlice(classId, data);
  }

  async invalidateIfStale() {
    if (!this.versions.isStale()) {
      return;
    }
    const classId = this.slice?.classId ?? reportCardsClassIdFromUrl(this.getUrl());
    if (!classId) {
      return;
    }
    await this.refreshSlice(classId);
  }

  private async refreshResults(classId: string) {
    const periodId = academicContext.periodId;
    if (!periodId || !this.slice) {
      return;
    }
    const client = getBrowserSchoolClient();
    const results = await loadClassReportCardResultsData(
      client,
      classId,
      periodId,
    );
    this.replaceResults(results);
  }

  private async generateReportCardResultCommand(studentId: string, periodId: string): Promise<boolean> {
    const client = getBrowserSchoolClient();
    const id = `rcr-${studentId}-${periodId}`;
    await client.commands.generateReportCardResult({
      id,
      studentId,
      periodId,
      generatedAt: nowIso(),
    });
    return true;
  }

  async generateForStudent(input: {
    studentId: string;
    successMessage?: string;
  }): Promise<boolean> {
    const periodId = academicContext.periodId;
    const classId = this.slice?.classId;
    if (!periodId || !classId) {
      return false;
    }

    const result = await runReportCardsRouteMutation({
      request: async () => {
        if (!await this.generateReportCardResultCommand(input.studentId, periodId)) {
          throw new Error('Aucun modèle de bulletin publié pour cette classe.');
        }
        return true;
      },
      successMessage: input.successMessage,
      versionKeys: ['reportCards'],
      onSuccess: () => this.refreshResults(classId),
    });
    return result !== null;
  }

  async generateForClass(input: {
    classId: string;
    successMessage?: string;
  }): Promise<number | null> {
    const periodId = academicContext.periodId;
    if (!periodId || this.slice?.classId !== input.classId) {
      return null;
    }

    const pending = this.slice.students.filter(
      student => !this.slice?.results.some(
        result => result.studentId === student.id && result.academicPeriodId === periodId,
      ),
    );

    if (pending.length === 0) {
      return 0;
    }

    return runReportCardsRouteMutation({
      request: async () => {
        let count = 0;
        for (const student of pending) {
          if (await this.generateReportCardResultCommand(student.id, periodId)) {
            count += 1;
          }
        }
        return count;
      },
      successMessage: input.successMessage,
      versionKeys: ['reportCards'],
      onSuccess: () => this.refreshResults(input.classId),
    });
  }

  async publishResult(input: {
    reviewedRevision?: boolean;
    resultId: string;
    successMessage?: string;
  }): Promise<boolean> {
    const existing = this.slice?.results.find(result => result.id === input.resultId);
    const periodId = existing?.academicPeriodId || academicContext.periodId;
    if (!periodId || !existing || !this.slice || (existing.revisedDraft && !input.reviewedRevision)) {
      return false;
    }

    const client = getBrowserSchoolClient();
    const result = await runReportCardsRouteMutation({
      request: () => client.commands.publishReportCardResult({
        reviewedGradingRevision: (existing.revisedDraft ?? existing).gradingPolicyRevision!,
        reviewedDraftVersion: (existing.revisedDraft ?? existing).version!,
        reviewedReportConfigurationRevision: (existing.revisedDraft ?? existing).reportConfigurationRevision,
        id: existing.id,
        studentId: existing.studentId,
        periodId,
        publishedAt: nowIso(),
      }),
      successMessage: input.successMessage,
      versionKeys: ['reportCards'],
      onSuccess: () => this.refreshResults(this.slice!.classId),
    });
    return result !== null;
  }
}

export function setReportCardsPageState(state: ReportCardsPageState) {
  setContext(REPORT_CARDS_PAGE_STATE_KEY, state);
}

export function getReportCardsPageState() {
  return getContext<ReportCardsPageState>(REPORT_CARDS_PAGE_STATE_KEY);
}
