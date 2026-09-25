import type { components } from '$lib/api/schema';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { AssessmentKind, Evaluation } from '$lib/types/school';
import type {
  EvaluationGradingTabState,
} from './[[id]]/(tabs)/grading/evaluation-grading-tab.svelte';
import type { EvaluationsPageSlice } from './lib/evaluation-helpers';
import { kindCompleteAssessmentTiming, optionalAssessmentInstant } from '$lib/academic/assessment-timing';
import { academicContext } from '$lib/academic/context.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { nowIso, todayDateInput } from '$lib/date/format';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import {
  applyGradeEntry,
  emptyEvaluationsSlice,
  evaluationDetailIdFromUrl,
  evaluationsClassIdFromUrl,
  normalizedDescription,
  rollbackGradeEntry,
} from './lib/evaluation-helpers';
import { runEvaluationRouteMutation } from './lib/evaluation-route-mutation';
import { loadEvaluationsSlice, queryEvaluationsListPage } from './lib/evaluations-queries';

type ApiAssessment = components['schemas']['Assessment'];

const EVALUATIONS_VERSION_FAMILIES = ['evaluations', 'students'] as const satisfies readonly EntityVersionKey[];

const EVALUATIONS_PAGE_STATE_KEY = Symbol('evaluations-page-state');

export type { EvaluationsPageSlice };

export class EvaluationsPageState {
  slice = $state<EvaluationsPageSlice | null>(null);
  grading = $state<EvaluationGradingTabState | null>(null);

  private readonly versions = new RouteVersionSnapshot(EVALUATIONS_VERSION_FAMILIES);

  constructor(private readonly getUrl: () => URL) {}

  attachGrading(state: EvaluationGradingTabState) {
    this.grading = state;
  }

  detachGrading(state: EvaluationGradingTabState) {
    if (this.grading === state) {
      this.grading = null;
    }
  }

  applySlice(classId: string, data: Partial<Omit<EvaluationsPageSlice, 'classId'>>) {
    this.slice = { ...emptyEvaluationsSlice(classId), ...data, classId };
    this.versions.markLoaded();
  }

  seed(classId: string, data: Partial<Omit<EvaluationsPageSlice, 'classId'>>) {
    this.applySlice(classId, data);
  }

  clear() {
    this.slice = null;
  }

  get selectedId() {
    return evaluationDetailIdFromUrl(this.getUrl());
  }

  get selected() {
    const classId = evaluationsClassIdFromUrl(this.getUrl());
    if (!classId) {
      return undefined;
    }
    return this.selectedEvaluation(classId, this.selectedId);
  }

  evaluationsFor(classId: string) {
    return this.slice?.classId === classId ? this.slice.evaluations : [];
  }

  selectedEvaluation(classId: string, evaluationId?: string) {
    if (!evaluationId || this.slice?.classId !== classId) {
      return undefined;
    }
    return this.slice.evaluations.find(evaluation => evaluation.id === evaluationId);
  }

  subjectsFor(classId: string) {
    return this.slice?.classId === classId ? this.slice.subjects : [];
  }

  studentsFor(classId: string) {
    return this.grading?.studentsFor(classId) ?? [];
  }

  scoreFor(assessmentId: string, studentId: string): number | null {
    return this.grading?.scoreFor(assessmentId, studentId) ?? null;
  }

  appendEvaluation(evaluation: Evaluation) {
    if (!this.slice) {
      return;
    }
    this.slice = {
      ...this.slice,
      evaluations: [evaluation, ...this.slice.evaluations],
    };
  }

  patchEvaluation(id: string, patch: Partial<Evaluation>) {
    if (!this.slice) {
      return;
    }
    this.slice = {
      ...this.slice,
      evaluations: this.slice.evaluations.map(evaluation =>
        evaluation.id === id ? { ...evaluation, ...patch } : evaluation,
      ),
    };
  }

  removeEvaluation(id: string) {
    if (!this.slice) {
      return;
    }
    this.slice = {
      ...this.slice,
      evaluations: this.slice.evaluations.filter(evaluation => evaluation.id !== id),
    };
    this.grading?.removeResultsForAssessment(id);
  }

  upsertAssessmentResult(result: import('$lib/types/school').AssessmentResultRow) {
    this.grading?.upsertAssessmentResult(result);
  }

  removeAssessmentResult(id: string) {
    this.grading?.removeAssessmentResult(id);
  }

  private buildOptimisticEvaluation(input: {
    id: string;
    classGroupId: string;
    classSubjectId: string;
    title: string;
    kind: AssessmentKind;
    maxScore: number;
    coefficient: number;
    date: string;
    description?: string;
    dueDate?: string;
    startsAt?: string;
    endsAt?: string;
    lessonSessionId?: string | null;
  }): Evaluation {
    const subject = this.subjectsFor(input.classGroupId).find(entry => entry.id === input.classSubjectId);
    const students = this.studentsFor(input.classGroupId);
    return {
      id: input.id,
      classId: input.classGroupId,
      classSubjectId: input.classSubjectId,
      title: input.title.trim(),
      subject: subject?.name ?? '-',
      kind: input.kind,
      date: input.date,
      coefficient: input.coefficient,
      averageMark: 0,
      outOf: input.maxScore,
      graded: 0,
      total: students.length,
      description: input.description?.trim() ?? '',
      dueDate: input.dueDate,
      assignedDate: input.dueDate,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      lessonSessionId: input.lessonSessionId,
      attachments: [],
      submissions: students.map(student => ({
        studentId: student.id,
        status: 'missing' as const,
      })),
      submittedCount: 0,
    };
  }

  queryListPage(classId: string) {
    return queryEvaluationsListPage(classId);
  }

  async refreshSlice(classId: string) {
    const data = await loadEvaluationsSlice(classId);
    this.applySlice(classId, data);
  }

  async invalidateIfStale() {
    if (!this.versions.isStale()) {
      return;
    }
    const classId = this.slice?.classId ?? evaluationsClassIdFromUrl(this.getUrl());
    if (!classId) {
      return;
    }
    await this.refreshSlice(classId);
  }

  async createEvaluation(input: {
    classGroupId: string;
    classSubjectId: string;
    title: string;
    description?: string;
    maxScore: number;
    coefficient?: number;
    kind?: AssessmentKind;
    dueAt?: string;
    startsAt?: string;
    endsAt?: string;
    lessonSessionId?: string | null;
    successMessage?: string;
  }): Promise<string | null> {
    const client = getBrowserSchoolClient();
    const periodId = academicContext.periodId;
    if (!periodId) {
      return null;
    }

    const kind = input.kind ?? 'quiz';
    const timing = kindCompleteAssessmentTiming({
      kind,
      dueAt: input.dueAt,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      lessonSessionId: input.lessonSessionId,
    });
    if (!timing) {
      return null;
    }

    const id = `asm-${crypto.randomUUID()}`;
    const assessmentDate = timing.kind === 'homework'
      ? timing.dueAt
      : (timing.startsAt ?? todayDateInput()).slice(0, 10);
    const optimistic = this.buildOptimisticEvaluation({
      id,
      classGroupId: input.classGroupId,
      classSubjectId: input.classSubjectId,
      title: input.title,
      kind,
      maxScore: input.maxScore,
      coefficient: input.coefficient ?? 1,
      date: assessmentDate,
      description: input.description,
      dueDate: timing.kind === 'homework' ? timing.dueAt : undefined,
      startsAt: timing.kind === 'homework' ? undefined : timing.startsAt ?? undefined,
      endsAt: timing.kind === 'homework' ? undefined : timing.endsAt ?? undefined,
      lessonSessionId: timing.kind === 'homework' ? null : timing.lessonSessionId,
    });
    const description = normalizedDescription(input.description);

    const result = await runEvaluationRouteMutation({
      request: () => client.commands.createAssessment({
        id,
        classGroupId: input.classGroupId,
        classSubjectId: input.classSubjectId,
        periodId,
        title: input.title.trim(),
        ...(description ? { description } : {}),
        kind,
        maxScore: input.maxScore,
        coefficient: input.coefficient ?? 1,
        attachments: [],
        createdAt: nowIso(),
        dueAt: timing.dueAt,
        startsAt: timing.startsAt,
        endsAt: timing.endsAt,
        lessonSessionId: timing.lessonSessionId,
      }),
      successMessage: input.successMessage,
      versionKeys: ['evaluations'],
      apply: () => {
        this.appendEvaluation(optimistic);
      },
      rollback: () => {
        this.removeEvaluation(id);
      },
    });

    return result ? id : null;
  }

  async updateEvaluation(input: {
    assessmentId: string;
    classSubjectId: string;
    title: string;
    description?: string;
    dueDate?: string;
    startsAt?: string | null;
    endsAt?: string | null;
    lessonSessionId?: string | null;
    maxScore?: number;
    coefficient?: number;
    successMessage?: string;
  }): Promise<boolean> {
    const client = getBrowserSchoolClient();
    const previous = this.slice?.evaluations.find(evaluation => evaluation.id === input.assessmentId);
    const subject = this.slice?.subjects.find(entry => entry.id === input.classSubjectId);

    const result = await runEvaluationRouteMutation({
      request: async () => {
        const existing = await client.entities.assessments.get(input.assessmentId);
        const description = input.description !== undefined
          ? normalizedDescription(input.description)
          : normalizedDescription(existing.description ?? undefined);
        const timing = kindCompleteAssessmentTiming({
          kind: existing.kind,
          dueAt: input.dueDate ?? optionalAssessmentInstant(existing.dueAt),
          startsAt: input.startsAt !== undefined ? input.startsAt : optionalAssessmentInstant(existing.startsAt),
          endsAt: input.endsAt !== undefined ? input.endsAt : optionalAssessmentInstant(existing.endsAt),
          lessonSessionId: input.lessonSessionId !== undefined
            ? input.lessonSessionId
            : optionalAssessmentInstant(existing.lessonSessionId),
        });
        if (!timing) {
          throw new Error('ASSESSMENT_TIMING_REQUIRED');
        }
        const payload: ApiAssessment = {
          ...existing,
          classSubjectId: input.classSubjectId,
          title: input.title.trim(),
          ...(description ? { description } : { description: undefined }),
          kind: existing.kind,
          maxScore: input.maxScore ?? existing.maxScore,
          coefficient: input.coefficient ?? existing.coefficient,
          dueAt: timing.dueAt,
          startsAt: timing.startsAt,
          endsAt: timing.endsAt,
          lessonSessionId: timing.lessonSessionId,
        };
        return client.entities.assessments.save(payload);
      },
      successMessage: input.successMessage,
      versionKeys: ['evaluations'],
      apply: () => {
        const kind = previous?.kind ?? 'homework';
        this.patchEvaluation(input.assessmentId, {
          classSubjectId: input.classSubjectId,
          subject: subject?.name ?? previous?.subject ?? '-',
          title: input.title.trim(),
          description: normalizedDescription(input.description) ?? previous?.description ?? '',
          kind,
          outOf: input.maxScore ?? previous?.outOf ?? 20,
          coefficient: input.coefficient ?? previous?.coefficient ?? 1,
          dueDate: kind === 'homework' ? (input.dueDate ?? previous?.dueDate) : undefined,
          assignedDate: kind === 'homework' ? (input.dueDate ?? previous?.assignedDate) : previous?.assignedDate,
          date: kind === 'homework'
            ? (input.dueDate ?? previous?.date ?? '')
            : (input.startsAt ?? previous?.startsAt ?? previous?.date ?? '').toString().slice(0, 10),
          startsAt: kind === 'homework' ? undefined : (input.startsAt ?? previous?.startsAt),
          endsAt: kind === 'homework' ? undefined : (input.endsAt ?? previous?.endsAt),
          lessonSessionId: kind === 'homework' ? null : (input.lessonSessionId ?? previous?.lessonSessionId),
        });
      },
      rollback: () => {
        if (previous) {
          this.patchEvaluation(input.assessmentId, previous);
        }
      },
    });
    return result !== null;
  }

  async deleteEvaluation(input: {
    assessmentId: string;
    successMessage?: string;
  }): Promise<boolean> {
    const client = getBrowserSchoolClient();
    const previous = this.slice?.evaluations.find(evaluation => evaluation.id === input.assessmentId);
    const previousResults = this.grading?.slice?.assessmentResults.filter(result => result.assessmentId === input.assessmentId) ?? [];
    const result = await runEvaluationRouteMutation({
      request: () => client.entities.assessments.delete({ id: input.assessmentId }),
      successMessage: input.successMessage,
      versionKeys: ['evaluations'],
      apply: () => {
        this.removeEvaluation(input.assessmentId);
      },
      rollback: () => {
        if (previous) {
          this.appendEvaluation(previous);
        }
        for (const previousResult of previousResults) {
          this.upsertAssessmentResult(previousResult);
        }
      },
    });
    return result !== null;
  }

  private marksRequestIds = new SvelteMap<string, string>();

  async reviewMarks(action: 'submit' | 'request' | 'approve' | 'reject' | 'withdraw', details: {
    reason?: string;
    correctionId?: string;
    changes?: components['schemas']['RequestAssessmentMarksCorrectionCommand']['changes'];
  } = {}): Promise<boolean> {
    const review = this.grading?.review;
    if (!review)
      return false;
    const client = getBrowserSchoolClient();
    const correction = review.corrections.find(row => row.id === details.correctionId);
    const key = JSON.stringify({ action, assessmentId: review.assessment.id, revision: review.assessment.marksRevision, ...details, version: correction?.version });
    let requestId = this.marksRequestIds.get(key);
    if (!requestId) {
 requestId = crypto.randomUUID();
 this.marksRequestIds.set(key, requestId);
}
    const input = { assessmentId: review.assessment.id, expectedRevision: review.assessment.marksRevision, requestId };
    const decision = { correctionId: details.correctionId ?? '', expectedVersion: correction?.version ?? 0, requestId };
    const result = await runEvaluationRouteMutation({
      request: async () => {
        switch (action) {
          case 'submit': return client.commands.submitAssessmentMarks(input);
          case 'request': return client.commands.requestAssessmentMarksCorrection({ ...input, reason: details.reason ?? '', changes: details.changes ?? [] });
          case 'approve': return client.commands.approveAssessmentMarksCorrection(decision);
          case 'reject': return client.commands.rejectAssessmentMarksCorrection({ ...decision, reason: details.reason ?? '' });
          case 'withdraw': return client.commands.withdrawAssessmentMarksCorrection(decision);
        }
      },
      successMessage: 'Notes mises à jour',
      versionKeys: ['evaluations', 'reportCards'],
      onSuccess: async () => {
        this.marksRequestIds.delete(key);
        if (this.grading) {
          this.grading.review = await client.queries.getAssessmentMarksReview({ assessmentId: input.assessmentId });
          for (const mark of this.grading.review.results) this.grading.upsertAssessmentResult({ ...mark, score: mark.score ?? null });
        }
      },
    });
    return result !== null;
  }

  async recordGrade(input: {
    studentId: string;
    assessmentId: string;
    score: number | null;
    designation?: 'scored' | 'absent' | 'exempt';
    successMessage?: string;
  }): Promise<boolean> {
    const client = getBrowserSchoolClient();
    const grading = this.grading;
    if (!grading?.review || grading.review.assessment.marksStatus !== 'draft')
      return false;
    const currentResults = grading?.slice?.assessmentResults ?? [];
    const applied = applyGradeEntry({
      results: currentResults,
      assessmentId: input.assessmentId,
      studentId: input.studentId,
      score: input.score,
    });
    const previousEvaluation = this.slice?.evaluations.find(evaluation => evaluation.id === input.assessmentId);
    const previousStats = previousEvaluation
      ? { graded: previousEvaluation.graded, averageMark: previousEvaluation.averageMark }
      : null;

    const result = await runEvaluationRouteMutation({
      request: () => client.commands.recordAssessmentResult({
        requestId: crypto.randomUUID(),
        expectedRevision: grading!.review!.assessment.marksRevision,
        id: applied.resultId,
        studentId: input.studentId,
        assessmentId: input.assessmentId,
        score: input.score,
      }),
      successMessage: input.successMessage,
      versionKeys: ['evaluations', 'students'],
      onSuccess: async () => { grading.review = await client.queries.getAssessmentMarksReview({ assessmentId: input.assessmentId }); },
      apply: () => {
        this.upsertAssessmentResult({
          id: applied.resultId,
          studentId: input.studentId,
          assessmentId: input.assessmentId,
          score: input.score,
        });
        this.patchEvaluation(input.assessmentId, applied.stats);
      },
      rollback: () => {
        const rolled = rollbackGradeEntry({
          results: this.grading?.slice?.assessmentResults ?? applied.nextResults,
          resultId: applied.resultId,
          previousResult: applied.previousResult,
          assessmentId: input.assessmentId,
        });
        if (applied.previousResult) {
          this.upsertAssessmentResult(applied.previousResult);
        }
        else {
          this.removeAssessmentResult(applied.resultId);
        }
        this.patchEvaluation(input.assessmentId, previousStats ?? rolled.stats);
      },
    });

    return result !== null;
  }
}

export function setEvaluationsPageState(state: EvaluationsPageState) {
  setContext(EVALUATIONS_PAGE_STATE_KEY, state);
}

export function getEvaluationsPageState() {
  return getContext<EvaluationsPageState>(EVALUATIONS_PAGE_STATE_KEY);
}
