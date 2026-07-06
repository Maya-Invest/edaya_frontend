import type { components } from '$lib/api/schema';
import type { Evaluation } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

type ApiAssessment = components['schemas']['Assessment'];

function normalizedDescription(description?: string): string | undefined {
	const trimmed = description?.trim();
	return trimmed ? trimmed : undefined;
}

function buildInClassAssessmentWindow(date: Date): { startsAt: string; endsAt: string } {
	const startsAt = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	startsAt.setUTCHours(9, 0, 0, 0);
	const endsAt = new Date(startsAt);
	endsAt.setUTCHours(10, 0, 0, 0);
	return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
}

function buildOptimisticEvaluation(input: {
	id: string;
	classGroupId: string;
	classSubjectId: string;
	title: string;
	kind: Evaluation['kind'];
	maxScore: number;
	coefficient: number;
	date: string;
	description?: string;
	dueDate?: string;
	assignedDate?: string;
}): Evaluation {
	const students = detailDataContext.studentsForClass(input.classGroupId);
	const subject = detailDataContext.subjects.find(entry => entry.id === input.classSubjectId);

	return {
		id: input.id,
		classId: input.classGroupId,
		classSubjectId: input.classSubjectId,
		title: input.title.trim(),
		subject: subject?.name ?? '—',
		kind: input.kind,
		date: input.date,
		coefficient: input.coefficient,
		averageMark: 0,
		outOf: input.maxScore,
		graded: 0,
		total: students.length,
		description: input.description?.trim() ?? '',
		dueDate: input.dueDate,
		assignedDate: input.assignedDate,
		attachments: [],
		submissions: students.map(student => ({
			studentId: student.id,
			status: 'missing' as const,
		})),
		submittedCount: 0,
	};
}

function evaluationStatsFromResults(assessmentId: string): Pick<Evaluation, 'graded' | 'averageMark'> {
	const scored = detailDataContext.assessmentResults.filter(
		result => result.assessmentId === assessmentId && typeof result.score === 'number',
	);
	return {
		graded: scored.length,
		averageMark: scored.length > 0
			? scored.reduce((sum, result) => sum + (result.score ?? 0), 0) / scored.length
			: 0,
	};
}

export async function createAssessmentMutation(input: {
	classGroupId: string;
	classSubjectId: string;
	title: string;
	description?: string;
	maxScore: number;
	coefficient?: number;
	kind?: Evaluation['kind'];
	dueAt?: string;
	assignedDate?: string;
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const periodId = academicContext.periodId;
	if (!periodId) {
		toast.error(get(t)('eval.noPeriod'));
		return null;
	}

	const id = `asm-${Date.now().toString(36)}`;
	const kind = input.kind ?? 'quiz';
	const assessmentDate = input.dueAt ?? new Date().toISOString().slice(0, 10);
	const timingPayload = kind === 'homework'
		? { dueAt: assessmentDate }
		: buildInClassAssessmentWindow(new Date(assessmentDate));
	const optimistic = buildOptimisticEvaluation({
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
		assignedDate: kind === 'homework' ? (input.assignedDate ?? assessmentDate) : undefined,
	});

	const description = normalizedDescription(input.description);
	const result = await runMutation(() => client.commands.createAssessment({
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
		createdAt: new Date().toISOString(),
		...timingPayload,
	}), {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.appendEvaluation(optimistic);
		},
		rollback: () => {
			detailDataContext.removeEvaluation(id);
		},
	});
	return result ? id : null;
}

export async function updateAssessmentMutation(input: {
	assessmentId: string;
	title: string;
	description?: string;
	dueDate?: string;
	assignedDate?: string;
	maxScore?: number;
	coefficient?: number;
	kind?: Evaluation['kind'];
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = detailDataContext.evaluations.find(evaluation => evaluation.id === input.assessmentId);

	const result = await runMutation(async () => {
		const existing = await client.entities.assessments.get(input.assessmentId);
		const description = input.description !== undefined
			? normalizedDescription(input.description)
			: normalizedDescription(existing.description ?? undefined);
		const payload: ApiAssessment = {
			...existing,
			title: input.title.trim(),
			...(description ? { description } : { description: undefined }),
			kind: input.kind ?? existing.kind,
			maxScore: input.maxScore ?? existing.maxScore,
			coefficient: input.coefficient ?? existing.coefficient,
			dueAt: input.dueDate ?? existing.dueAt ?? null,
		};
		return client.entities.assessments.save(payload);
	}, {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.patchEvaluation(input.assessmentId, {
				title: input.title.trim(),
				description: normalizedDescription(input.description) ?? previous?.description ?? '',
				kind: input.kind ?? previous?.kind ?? 'homework',
				outOf: input.maxScore ?? previous?.outOf ?? 20,
				coefficient: input.coefficient ?? previous?.coefficient ?? 1,
				dueDate: input.dueDate ?? previous?.dueDate,
				assignedDate: input.assignedDate ?? previous?.assignedDate,
				date: input.dueDate ?? previous?.date ?? '',
			});
		},
		rollback: () => {
			if (previous) {
				detailDataContext.patchEvaluation(input.assessmentId, previous);
			}
		},
	});
	return result !== null;
}

export async function recordAssessmentResultMutation(input: {
	studentId: string;
	assessmentId: string;
	score: number;
	successMessage?: string;
	apply?: () => void;
	rollback?: () => void;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const id = `ar-${input.assessmentId}-${input.studentId}`;
	const result = await runMutation(() => client.commands.recordAssessmentResult({
		id,
		studentId: input.studentId,
		assessmentId: input.assessmentId,
		score: input.score,
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		apply: input.apply,
		rollback: input.rollback,
	});
	return result !== null;
}

export async function recordEvaluationAssessmentResultMutation(input: {
	studentId: string;
	assessmentId: string;
	score: number;
	successMessage?: string;
}): Promise<boolean> {
	const resultId = `ar-${input.assessmentId}-${input.studentId}`;
	const previousResult = detailDataContext.assessmentResults.find(result => result.id === resultId);
	const previousEvaluation = detailDataContext.evaluations.find(
		evaluation => evaluation.id === input.assessmentId,
	);
	const previousStats = previousEvaluation
		? { graded: previousEvaluation.graded, averageMark: previousEvaluation.averageMark }
		: null;

	return recordAssessmentResultMutation({
		...input,
		apply: () => {
			detailDataContext.appendAssessmentResult({
				id: resultId,
				studentId: input.studentId,
				assessmentId: input.assessmentId,
				score: input.score,
			});
			detailDataContext.patchEvaluation(input.assessmentId, evaluationStatsFromResults(input.assessmentId));
		},
		rollback: () => {
			if (previousResult) {
				detailDataContext.appendAssessmentResult(previousResult);
			}
			else {
				detailDataContext.removeAssessmentResult(resultId);
			}
			if (previousStats) {
				detailDataContext.patchEvaluation(input.assessmentId, previousStats);
			}
		},
	});
}
