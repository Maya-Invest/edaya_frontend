import type { components } from '$lib/api/schema';
import type { AssessmentKind, Evaluation } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { inClassAssessmentWindow, nowIso, todayDateInput } from '$lib/date/format';
import { getContext, setContext } from 'svelte';
import {
	emptyEvaluationsSlice,
	evaluationDetailIdFromUrl,
	evaluationStatsFromResults,
	normalizedDescription,
	type EvaluationsPageSlice,
} from './lib/evaluation-helpers';
import { runEvaluationRouteMutation } from './lib/evaluation-route-mutation';
import { queryEvaluationsListPage } from './lib/evaluations-queries';

type ApiAssessment = components['schemas']['Assessment'];

const EVALUATIONS_PAGE_STATE_KEY = Symbol('evaluations-page-state');

export type { EvaluationsPageSlice };

export class EvaluationsPageState {
	slice = $state<EvaluationsPageSlice | null>(null);

	constructor(private readonly getUrl: () => URL) {}

	seed(classId: string, data: Partial<Omit<EvaluationsPageSlice, 'classId'>>) {
		if (this.slice?.classId === classId) {
			return;
		}
		this.slice = { ...emptyEvaluationsSlice(classId), ...data, classId };
	}

	clear() {
		this.slice = null;
	}

	get selectedId() {
		return evaluationDetailIdFromUrl(this.getUrl());
	}

	get selected() {
		const classId = this.getUrl().pathname.match(/\/classes\/([^/]+)\/evaluations/)?.[1];
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
		return this.slice?.classId === classId
			? [...this.slice.students].sort((left, right) => left.name.localeCompare(right.name, 'fr'))
			: [];
	}

	scoreFor(assessmentId: string, studentId: string): number | null {
		const result = this.slice?.assessmentResults.find(
			entry => entry.assessmentId === assessmentId && entry.studentId === studentId,
		);
		return typeof result?.score === 'number' ? result.score : null;
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
			assessmentResults: this.slice.assessmentResults.filter(result => result.assessmentId !== id),
		};
	}

	upsertAssessmentResult(result: import('$lib/types/school').AssessmentResultRow) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			assessmentResults: [
				...this.slice.assessmentResults.filter(entry => entry.id !== result.id),
				result,
			],
		};
	}

	removeAssessmentResult(id: string) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			assessmentResults: this.slice.assessmentResults.filter(result => result.id !== id),
		};
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

	async createEvaluation(input: {
		classGroupId: string;
		classSubjectId: string;
		title: string;
		description?: string;
		maxScore: number;
		coefficient?: number;
		kind?: AssessmentKind;
		dueAt?: string;
		successMessage?: string;
	}): Promise<string | null> {
		const client = getBrowserSchoolClient();
		const periodId = academicContext.periodId;
		if (!periodId) {
			return null;
		}

		const id = `asm-${crypto.randomUUID()}`;
		const kind = input.kind ?? 'quiz';
		const assessmentDate = input.dueAt ?? todayDateInput();
		const timingPayload = kind === 'homework'
			? { dueAt: assessmentDate }
			: inClassAssessmentWindow(assessmentDate);
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
			dueDate: kind === 'homework' ? assessmentDate : undefined,
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
				...timingPayload,
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
		maxScore?: number;
		coefficient?: number;
		kind?: AssessmentKind;
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
				const payload: ApiAssessment = {
					...existing,
					classSubjectId: input.classSubjectId,
					title: input.title.trim(),
					...(description ? { description } : { description: undefined }),
					kind: input.kind ?? existing.kind,
					maxScore: input.maxScore ?? existing.maxScore,
					coefficient: input.coefficient ?? existing.coefficient,
					dueAt: input.dueDate ?? existing.dueAt ?? null,
				};
				return client.entities.assessments.save(payload);
			},
			successMessage: input.successMessage,
			versionKeys: ['evaluations'],
			apply: () => {
				this.patchEvaluation(input.assessmentId, {
					classSubjectId: input.classSubjectId,
					subject: subject?.name ?? previous?.subject ?? '-',
					title: input.title.trim(),
					description: normalizedDescription(input.description) ?? previous?.description ?? '',
					kind: input.kind ?? previous?.kind ?? 'homework',
					outOf: input.maxScore ?? previous?.outOf ?? 20,
					coefficient: input.coefficient ?? previous?.coefficient ?? 1,
					dueDate: input.dueDate ?? previous?.dueDate,
					assignedDate: input.dueDate ?? previous?.assignedDate,
					date: input.dueDate ?? previous?.date ?? '',
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
		const previousResults = this.slice?.assessmentResults.filter(result => result.assessmentId === input.assessmentId) ?? [];
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

	async recordGrade(input: {
		studentId: string;
		assessmentId: string;
		score: number;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const resultId = `ar-${input.assessmentId}-${input.studentId}`;
		const previousResult = this.slice?.assessmentResults.find(result => result.id === resultId);
		const previousEvaluation = this.slice?.evaluations.find(evaluation => evaluation.id === input.assessmentId);
		const previousStats = previousEvaluation
			? { graded: previousEvaluation.graded, averageMark: previousEvaluation.averageMark }
			: null;

		const result = await runEvaluationRouteMutation({
			request: () => client.commands.recordAssessmentResult({
				id: resultId,
				studentId: input.studentId,
				assessmentId: input.assessmentId,
				score: input.score,
				createdAt: nowIso(),
			}),
			successMessage: input.successMessage,
			versionKeys: ['evaluations', 'students'],
			apply: () => {
				this.upsertAssessmentResult({
					id: resultId,
					studentId: input.studentId,
					assessmentId: input.assessmentId,
					score: input.score,
				});
				this.patchEvaluation(
					input.assessmentId,
					evaluationStatsFromResults(input.assessmentId, this.slice?.assessmentResults ?? []),
				);
			},
			rollback: () => {
				if (previousResult) {
					this.upsertAssessmentResult(previousResult);
				}
				else {
					this.removeAssessmentResult(resultId);
				}
				if (previousStats) {
					this.patchEvaluation(input.assessmentId, previousStats);
				}
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
