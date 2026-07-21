import type { components } from '$lib/api/schema';
import type { Evaluation } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

type ApiAssessment = components['schemas']['Assessment'];

function normalizedDescription(description?: string): string | undefined {
	const trimmed = description?.trim();
	return trimmed || undefined;
}

function buildInClassAssessmentWindow(date: Date): { startsAt: string; endsAt: string } {
	const startsAt = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	startsAt.setUTCHours(9, 0, 0, 0);
	const endsAt = new Date(startsAt);
	endsAt.setUTCHours(10, 0, 0, 0);
	return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
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
		versionKeys: ['evaluations'],
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
		versionKeys: ['evaluations'],
	});
	return result !== null;
}

export async function recordAssessmentResultMutation(input: {
	studentId: string;
	assessmentId: string;
	score: number;
	successMessage?: string;
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
		versionKeys: ['evaluations'],
	});
	return result !== null;
}

export async function recordEvaluationAssessmentResultMutation(input: {
	studentId: string;
	assessmentId: string;
	score: number;
	successMessage?: string;
}): Promise<boolean> {
	return recordAssessmentResultMutation(input);
}
