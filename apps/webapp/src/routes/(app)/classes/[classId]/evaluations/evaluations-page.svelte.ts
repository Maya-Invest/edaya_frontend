import type { components } from '$lib/api/schema';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { AssessmentKind, Evaluation } from '$lib/types/school';
import type { EvaluationGradingTabState } from './[[id]]/(tabs)/grading/evaluation-grading-tab.svelte';
import type { EvaluationsPageSlice } from './lib/evaluation-helpers';
import type { GradeDraft, GradeSaveOutcome, MarksReview } from './lib/grading-task';
import { kindCompleteAssessmentTiming, optionalAssessmentInstant } from '$lib/academic/assessment-timing';
import { academicContext } from '$lib/academic/context.svelte';
import { loadAssessmentForEdit } from '$lib/api/assessments-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { nowIso, todayDateInput } from '$lib/date/format';
import { t } from '$lib/i18n';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { hasPermission } from '$lib/permissions';
import { getContext, setContext } from 'svelte';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { get } from 'svelte/store';
import { emptyEvaluationsSlice, evaluationDetailIdFromUrl, evaluationsClassIdFromUrl, normalizedDescription } from './lib/evaluation-helpers';
import { runEvaluationRouteMutation } from './lib/evaluation-route-mutation';
import { loadEvaluationsSlice, queryEvaluationsListPage } from './lib/evaluations-queries';
import { gradeCorrectable, gradeEditable, gradeValues } from './lib/grading-task';

type ApiAssessment = components['schemas']['Assessment'];
const EVALUATIONS_VERSION_FAMILIES = ['evaluations', 'students'] as const satisfies readonly EntityVersionKey[];
const EVALUATIONS_PAGE_STATE_KEY = Symbol('evaluations-page-state');
export type { EvaluationsPageSlice };
export class EvaluationsPageState {
	slice = $state<EvaluationsPageSlice | null>(null);
	grading = $state<EvaluationGradingTabState | null>(null);
	private readonly versions = new RouteVersionSnapshot(EVALUATIONS_VERSION_FAMILIES);
	constructor(private readonly getUrl: () => URL) {
	}

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
			evaluations: this.slice.evaluations.map(evaluation => evaluation.id === id ? { ...evaluation, ...patch } : evaluation),
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
		attachments?: Evaluation['attachments'];
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
			marksAvailable: false,
			outOf: input.maxScore,
			graded: 0,
			total: students.length,
			description: input.description?.trim() ?? '',
			dueDate: input.dueDate,
			assignedDate: input.dueDate,
			startsAt: input.startsAt,
			endsAt: input.endsAt,
			lessonSessionId: input.lessonSessionId,
			attachments: input.attachments ?? [],
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

	async completeEvaluation(id: string) {
		const result = await runEvaluationRouteMutation({ request: () => getBrowserSchoolClient().commands.completeAssessment({ assessmentId: id }), versionKeys: ['evaluations'] });
		if (result)
			this.patchEvaluation(id, { completedAt: String(result.completedAt ?? '') });
		return result !== null;
	}

	async createEvaluation(input: {
		classGroupId: string;
		classSubjectId: string;
		title: string;
		description?: string;
		attachments?: Evaluation['attachments'];
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
			attachments: input.attachments,
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
				attachments: input.attachments ?? [],
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
		attachments?: Evaluation['attachments'];
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
				if (!previous || !academicContext.periodId)
					throw new Error('ASSESSMENT_NOT_AVAILABLE');
				const existing = await loadAssessmentForEdit(client, previous.classId, academicContext.periodId, input.assessmentId);
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
					attachments: input.attachments ?? existing.attachments,
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
					attachments: input.attachments ?? previous?.attachments ?? [],
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
	private marksPending = new SvelteSet<string>();
	get scope() {
		return `${authSession.userId}|${academicContext.schoolScopeId}|${academicContext.yearId}|${academicContext.scopeGeneration}|${evaluationsClassIdFromUrl(this.getUrl())}`;
	}

	canEnterMarks(assessmentId: string) {
		const evaluation = this.selected;
		return evaluation?.id === assessmentId && hasPermission('GRADE_MANAGE', {
			classId: evaluation.classId,
			subject: evaluation.classSubjectId,
			subjectId: this.subjectsFor(evaluation.classId).find(row => row.id === evaluation.classSubjectId)?.subjectId,
			assessmentId,
		});
	}

	async loadMarks(assessmentId: string): Promise<MarksReview | null> {
		const scope = this.scope;
		const grading = this.grading;
		const classId = evaluationsClassIdFromUrl(this.getUrl());
		if (!classId || this.selectedId !== assessmentId || !grading)
			return null;
		const generation = grading.beginRead();
		const review = await getBrowserSchoolClient().queries.getAssessmentMarksReview({ assessmentId });
		if (scope !== this.scope || grading !== this.grading || generation !== grading.generation || this.selectedId !== assessmentId)
			return null;
		if (review.assessment.id !== assessmentId || review.assessment.classGroupId !== classId)
			return null;
		grading.adopt(classId, review);
		return review;
	}

	private marksRequestId(key: string) {
		let id = this.marksRequestIds.get(key);
		if (!id) {
			id = crypto.randomUUID();
			this.marksRequestIds.set(key, id);
		}
		return id;
	}

	async reviewMarks(action: 'submit' | 'request' | 'approve' | 'reject' | 'withdraw', details: {
		reason?: string;
		correctionId?: string;
		changes?: components['schemas']['RequestAssessmentMarksCorrectionCommand']['changes'];
		snapshot?: MarksReview;
		scope?: string;
	} = {}): Promise<boolean> {
		const review = details.snapshot ?? this.grading?.review;
		const scope = this.scope;
		const grading = this.grading;
		if (!review || !grading || (details.scope && details.scope !== scope)
			|| this.selectedId !== review.assessment.id || this.selected?.classId !== review.assessment.classGroupId) {
			return false;
		}
		const current = grading.review;
		if (current?.assessment.id !== review.assessment.id)
			return false;
		if (['submit', 'request', 'withdraw'].includes(action) && !this.canEnterMarks(review.assessment.id))
return false;
		if (['approve', 'reject'].includes(action) && !hasPermission('GRADE_VALIDATE', { classId: review.assessment.classGroupId }))
return false;
		const correction = review.corrections.find(row => row.id === details.correctionId);
		const currentCorrection = current.corrections.find(row => row.id === details.correctionId);
		if (action === 'submit' && (!review.allowedActions.submit || !current.allowedActions.submit))
			return false;
		if (action === 'request' && (!review.allowedActions.requestCorrection || !current.allowedActions.requestCorrection
			|| !details.reason?.trim() || !details.changes?.length
			|| details.changes.some(change => !gradeCorrectable(review, change.resultId) || !gradeCorrectable(current, change.resultId)))) {
			return false;
		}
		if (action !== 'submit' && action !== 'request' && (!correction?.allowedActions[action] || !currentCorrection?.allowedActions[action]))
			return false;
		if (action === 'reject' && !details.reason?.trim())
			return false;
		const pendingKey = `${scope}|${review.assessment.id}`;
		if (this.marksPending.has(pendingKey))
			return false;
		const generation = grading.generation;
		const client = getBrowserSchoolClient();
		const key = JSON.stringify({ scope, action, assessmentId: review.assessment.id, revision: review.assessment.marksRevision, gradingRevision: review.gradingPolicy?.revision, reason: details.reason, changes: details.changes, correctionId: correction?.id, version: correction?.version });
		const requestId = this.marksRequestId(key);
		const input = { assessmentId: review.assessment.id, expectedRevision: review.assessment.marksRevision, expectedGradingRevision: review.gradingPolicy?.revision ?? 0, requestId };
		this.marksPending.add(pendingKey);
		try {
			const result = await runEvaluationRouteMutation({
				request: async () => {
					switch (action) {
						case 'submit': return client.commands.submitAssessmentMarks(input);
						case 'request': return client.commands.requestAssessmentMarksCorrection({ ...input, reason: details.reason!.trim(), changes: details.changes! });
						case 'approve': return client.commands.approveAssessmentMarksCorrection({ correctionId: correction!.id, expectedVersion: correction!.version, requestId });
						case 'reject': return client.commands.rejectAssessmentMarksCorrection({ correctionId: correction!.id, expectedVersion: correction!.version, requestId, reason: details.reason!.trim() });
						case 'withdraw': return client.commands.withdrawAssessmentMarksCorrection({ correctionId: correction!.id, expectedVersion: correction!.version, requestId });
					}
				},
				successMessage: get(t)('gradeTask.reviewSaved'),
				versionKeys: ['evaluations', 'reportCards'],
				onSuccess: async () => {
					this.marksRequestIds.delete(key);
					if (scope !== this.scope || grading !== this.grading || generation !== grading.generation || this.selectedId !== input.assessmentId)
						return;
					await this.loadMarks(input.assessmentId);
				},
			});
			return result !== null;
		}
		finally { this.marksPending.delete(pendingKey); }
	}

	async saveGrade(review: MarksReview, studentId: string, draft: GradeDraft, options: { scope: string; requestId?: string; successMessage?: string }): Promise<GradeSaveOutcome> {
		const grading = this.grading;
		const scope = this.scope;
		const assessmentId = review.assessment.id;
		const values = gradeValues(draft, review);
		if (!values || !grading || scope !== options.scope || !this.canEnterMarks(assessmentId)
			|| this.selected?.classId !== review.assessment.classGroupId || !gradeEditable(review, studentId)
			|| grading.review?.assessment.id !== assessmentId || !gradeEditable(grading.review, studentId)) {
			return { saved: false };
		}
		const pendingKey = `${scope}|${assessmentId}`;
		if (this.marksPending.has(pendingKey))
			return { saved: false };
		const generation = grading.generation;
		const client = getBrowserSchoolClient();
		const id = review.results.find(row => row.studentId === studentId)?.id ?? `ar-${assessmentId}-${studentId}`;
		const payload = { id, studentId, assessmentId, ...values, expectedRevision: review.assessment.marksRevision, expectedGradingRevision: review.gradingPolicy!.revision };
		const key = JSON.stringify({ scope, ...payload });
		const requestId = options.requestId ?? this.marksRequestId(key);
		let refreshed: MarksReview | null = null;
		this.marksPending.add(pendingKey);
		try {
			const result = await runEvaluationRouteMutation({
				request: () => client.commands.recordAssessmentResult({ ...payload, requestId }),
				successMessage: options.successMessage,
				versionKeys: ['evaluations', 'students'],
				onSuccess: async () => {
					this.marksRequestIds.delete(key);
					if (scope !== this.scope || grading !== this.grading || generation !== grading.generation || this.selectedId !== assessmentId)
						return;
					refreshed = await this.loadMarks(assessmentId);
				},
			});
			return result === null ? { saved: false } : { saved: true, result, review: refreshed };
		}
		finally { this.marksPending.delete(pendingKey); }
	}

	async recordGrade(input: {
		requestId: string;
		expectedRevision: number;
		expectedGradingRevision: number;
		studentId: string;
		assessmentId: string;
		score: number | null;
		mentionId?: string | null;
		designation?: 'scored' | 'absent' | 'exempt';
		successMessage?: string;
		snapshot?: MarksReview;
		scope?: string;
	}): Promise<boolean> {
		const review = input.snapshot ?? this.grading?.review;
		if (!review || review.assessment.id !== input.assessmentId
			|| review.assessment.marksRevision !== input.expectedRevision || review.gradingPolicy?.revision !== input.expectedGradingRevision) {
			return false;
		}
		const result = await this.saveGrade(review, input.studentId, { score: String(input.score ?? ''), mentionId: input.mentionId ?? '', designation: input.designation ?? 'scored' }, { scope: input.scope ?? this.scope, requestId: input.requestId, successMessage: input.successMessage });
		return result.saved;
	}
}
export function setEvaluationsPageState(state: EvaluationsPageState) {
	setContext(EVALUATIONS_PAGE_STATE_KEY, state);
}
export function getEvaluationsPageState() {
	return getContext<EvaluationsPageState>(EVALUATIONS_PAGE_STATE_KEY);
}
