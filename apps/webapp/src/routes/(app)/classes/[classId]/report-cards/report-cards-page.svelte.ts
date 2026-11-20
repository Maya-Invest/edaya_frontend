import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { ReportCardResult } from '$lib/types/report-cards';
import type { ReportPupil, ReportRosterSelection } from './lib/report-cards-queries';
import { academicContext } from '$lib/academic/context.svelte';
import { listAllEntityPages, reportCardResultsForClassPeriod } from '$lib/api/entity-list-filters';
import { requestDocumentIssuanceBatchMutation, requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
import { writeHomeroomReportCommentMutation, writeReportSectionCommentsMutation } from '$lib/api/mutations/student-ops.mutations';
import { loadClassReportDetail } from '$lib/api/report-cards-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { nowIso } from '$lib/date/format';
import { readClassReportCardListFilters } from '$lib/list/list-url-filters';
import { ScopedCursorList } from '$lib/list/scoped-cursor-list.svelte';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { ApiError } from '@maya-invest/edaya-api-client';
import { getContext, setContext } from 'svelte';
import {
  reportCardDetailIdFromUrl,
  reportCardsClassIdFromUrl,
} from './lib/report-cards-helpers';
import { queryReportCardsListPage, readReportPage } from './lib/report-cards-queries';
import { runReportCardsRouteMutation } from './lib/report-cards-route-mutation';

const REPORT_CARDS_VERSION_FAMILIES = ['reportCards', 'students', 'guardians', 'enrollments', 'subjects', 'evaluations'] as const satisfies readonly EntityVersionKey[];

const REPORT_CARDS_PAGE_STATE_KEY = Symbol('report-cards-page-state');

export class ReportCardsPageState {
  performWriteReportSectionComments = (...args: Parameters<typeof writeReportSectionCommentsMutation>) => writeReportSectionCommentsMutation(...args);

  performRequestDocumentIssuance = (...args: Parameters<typeof requestDocumentIssuanceMutation>) => requestDocumentIssuanceMutation(...args);

  performRequestDocumentIssuanceBatch = (...args: Parameters<typeof requestDocumentIssuanceBatchMutation>) => requestDocumentIssuanceBatchMutation(...args);

  performWriteHomeroomReportComment = (...args: Parameters<typeof writeHomeroomReportCommentMutation>) => writeHomeroomReportCommentMutation(...args);

  private readonly versions = new RouteVersionSnapshot(REPORT_CARDS_VERSION_FAMILIES);
  constructor(private readonly getUrl: () => URL) {}

  readonly scope = $derived(JSON.stringify([authSession.authUserId, authSession.userId, authSession.schoolId, academicContext.scopeGeneration, authSession.grants]));
  private get selection(): ReportRosterSelection {
    return { scope: this.scope, classId: reportCardsClassIdFromUrl(this.getUrl()) ?? '', periodId: academicContext.periodId ?? '', filters: readClassReportCardListFilters(this.getUrl()) };
  }

  readonly list = new ScopedCursorList<ReportRosterSelection, ReportPupil, { missingValues: boolean; missingGrading: boolean }>(
    () => this.selection,
    () => {
      this.detail = undefined;
      this.detailRevision++;
    },
    readReportPage,
    async (selection) => {
      const items: ReportPupil[] = [];
      let cursor: string | undefined;
      do {
        const page = await readReportPage(selection, cursor);
        items.push(...page.items);
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      return items;
    },
  );

  private detail = $state.raw<{ key: string; result: ReportCardResult; name?: string }>();
  detailRevision = $state(0);
  get selectedId() { return reportCardDetailIdFromUrl(this.getUrl()); }
  get detailScope() {
    const { scope, classId, periodId } = this.selection;
    return JSON.stringify([scope, classId, periodId, this.selectedId]);
  }

  get selected() { return this.detail?.key === this.detailScope ? this.detail.result : undefined; }

  async loadDetail(signal: AbortSignal) {
    const { classId, periodId } = this.selection;
    const id = this.selectedId;
    const key = this.detailScope;
    this.detail = undefined;
    if (!id || !periodId)
      return false;
    const client = getBrowserSchoolClient();
    try {
      const result = await loadClassReportDetail(client, id, classId, periodId);
      signal.throwIfAborted();
      if (!result || key !== this.detailScope)
        return false;
      let name = this.list.current?.items.find(row => row.id === result.studentId)?.name;
      if (!name) {
        try {
          const student = await client.entities.students.get(result.studentId);
          name = [student.firstName, student.lastName].join(' ').trim();
        }
        catch (error) {
          if (!(error instanceof ApiError) || ![403, 404].includes(error.status))
            throw error;
        }
      }
      signal.throwIfAborted();
      if (key !== this.detailScope)
        return false;
      this.detail = { key, result, name };
      return true;
    }
    catch (error) {
      if (error instanceof ApiError && [401, 403, 404].includes(error.status))
        return false;
      throw error;
    }
  }

  studentFor(id: string) {
    if (this.selected?.studentId === id && this.detail?.name)
      return { id, name: this.detail.name };
    return this.list.current?.items.find(row => row.id === id);
  }

  selectedResult(classId: string, resultId: string) {
    return this.selected?.classId === classId && this.selected?.id === resultId ? this.selected : undefined;
  }

  patchResult(id: string, patch: Partial<ReportCardResult>) {
    if (this.detail && this.selected?.id === id)
      this.detail = { ...this.detail, result: { ...this.selected, ...patch } };
  }

  queryListPage() { return queryReportCardsListPage(this); }
  async refreshList(signal?: AbortSignal) {
    const snapshot = this.versions.capture();
    if (await this.list.refresh(signal))
      this.versions.markLoaded(snapshot);
  }

  async invalidateIfStale() {
    if (this.versions.hasLoaded() && this.versions.isStale()) {
      this.detailRevision++;
      await this.refreshList();
    }
  }

  private async refreshResults(classId: string) {
    if (this.selection.classId !== classId)
      return;
    this.detailRevision++;
    await this.refreshList();
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
    const classId = this.selection.classId;
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
    if (!periodId || this.selection.classId !== input.classId) {
      return null;
    }

    const key = this.list.key;
    return runReportCardsRouteMutation({
      request: async () => {
        const pending = await this.list.export({ filters: { q: '', status: 'none' } });
        let count = 0;
        for (const student of pending) {
          if (this.list.key !== key)
            return null;
          if (await this.generateReportCardResultCommand(student.id, periodId)) {
            count += 1;
          }
        }
        return this.list.key === key ? count : null;
      },
      successMessage: input.successMessage,
      versionKeys: ['reportCards'],
      onSuccess: () => this.list.key === key ? this.refreshResults(input.classId) : undefined,
    });
  }

  async exportPublished(classId: string, successMessage: string) {
    const periodId = academicContext.periodId;
    if (!periodId || classId !== this.selection.classId)
      return;
    const key = this.list.key;
    const client = getBrowserSchoolClient();
    const published = await listAllEntityPages(query => client.entities.results.list(query), {
      baseQuery: { ...reportCardResultsForClassPeriod(classId, periodId), status: 'published' },
    });
    if (key !== this.list.key)
      return;
    // The issuance command accepts up to 50 reports per transaction.
    for (let start = 0; start < published.length; start += 50) {
      if (key !== this.list.key)
        return;
      const response = await this.performRequestDocumentIssuanceBatch({
        templateKey: 'report-card.v1',
        items: published.slice(start, start + 50).map(entry => ({
          sourceId: entry.id,
          requestId: crypto.randomUUID(),
          studentId: entry.studentId,
          classGroupId: classId,
        })),
        successMessage: start + 50 >= published.length ? successMessage : undefined,
      });
      if (!response)
        return;
    }
  }

  async publishResult(input: {
    reviewedRevision?: boolean;
    resultId: string;
    successMessage?: string;
  }): Promise<boolean> {
    const { classId, periodId } = this.selection;
    if (!periodId || !classId)
      return false;
    const client = getBrowserSchoolClient();
    const key = this.list.key;
    const existing = this.selectedResult(classId, input.resultId) ?? await runReportCardsRouteMutation({
      request: () => loadClassReportDetail(client, input.resultId, classId, periodId),
      versionKeys: [],
    });
    if (!existing || key !== this.list.key || (existing.revisedDraft && !input.reviewedRevision))
      return false;
    const result = await runReportCardsRouteMutation({
      request: async () => {
        const reviewed = existing.revisedDraft ?? existing;
        await client.commands.publishReportCardResult({
          reviewedGradingRevision: reviewed.gradingPolicyRevision!,
          reviewedDraftVersion: reviewed.version!,
          reviewedReportConfigurationRevision: reviewed.reportConfigurationRevision,
          id: existing.id,
          studentId: existing.studentId,
          periodId,
          publishedAt: nowIso(),
        });
        return true;
      },
      successMessage: input.successMessage,
      versionKeys: ['reportCards'],
      onSuccess: () => this.refreshResults(classId),
    });
    return result === true;
  }
}

export function setReportCardsPageState(state: ReportCardsPageState) {
  setContext(REPORT_CARDS_PAGE_STATE_KEY, state);
}

export function getReportCardsPageState() {
  return getContext<ReportCardsPageState>(REPORT_CARDS_PAGE_STATE_KEY);
}
