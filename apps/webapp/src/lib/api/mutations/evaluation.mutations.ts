import type { components } from '$lib/api/schema';
import type { Evaluation } from '$lib/types/school';
import { kindCompleteAssessmentTiming, optionalAssessmentInstant } from '$lib/academic/assessment-timing';
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

export async function createAssessmentMutation(input: {
	classGroupId: string;
	classSubjectId: string;
	title: string;
	description?: string;
	maxScore: number;
	coefficient?: number;
	kind?: Evaluation['kind'];
	dueAt?: string;
	startsAt?: string;
	endsAt?: string;
	lessonSessionId?: string | null;
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
	const timing = kindCompleteAssessmentTiming({
		kind,
		dueAt: input.dueAt,
		startsAt: input.startsAt,
		endsAt: input.endsAt,
		lessonSessionId: input.lessonSessionId,
	});
	if (!timing) {
		toast.error(get(t)('eval.timingRequired'));
		return null;
	}

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
		dueAt: timing.dueAt,
		startsAt: timing.startsAt,
		endsAt: timing.endsAt,
		lessonSessionId: timing.lessonSessionId,
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
	startsAt?: string | null;
	endsAt?: string | null;
	lessonSessionId?: string | null;
	assignedDate?: string;
	maxScore?: number;
	coefficient?: number;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();

	const result = await runMutation(async () => {
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

export async function completeAssessmentMutation(input: {
	assessmentId: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(() => client.commands.completeAssessment({
		assessmentId: input.assessmentId,
		completedAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		versionKeys: ['evaluations'],
	});
	return result !== null;
}

export async function recordAssessmentResultComplianceMutation(input: {
	id?: string;
	studentId: string;
	assessmentId: string;
	status: 'met' | 'late' | 'missed' | 'excused';
	notes?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const id = input.id ?? `asr-${input.studentId}-${input.assessmentId}`;
	const result = await runMutation(() => client.commands.recordAssessmentResultCompliance({
		id,
		studentId: input.studentId,
		assessmentId: input.assessmentId,
		status: input.status,
		notes: input.notes?.trim() || null,
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		versionKeys: ['evaluations'],
	});
	return result !== null;
}

export async function createReportCardDefinitionSectionMutation(input: {
	id?: string;
	reportCardDefinitionId: string;
	name: string;
	kind: 'group' | 'subject';
	order: number;
	weight: number;
	role?: 'matieres' | 'synthese' | 'appreciation' | null;
	coefficient?: number | null;
	parentSectionId?: string | null;
	subjectId?: string | null;
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const id = input.id ?? `rcs-${Date.now().toString(36)}`;
	const result = await runMutation(() => client.commands.createReportCardDefinitionSection({
		id,
		reportCardDefinitionId: input.reportCardDefinitionId,
		name: input.name.trim(),
		kind: input.kind,
		order: input.order,
		weight: input.weight,
		role: input.role ?? null,
		coefficient: input.coefficient ?? null,
		parentSectionId: input.parentSectionId ?? null,
		subjectId: input.subjectId ?? null,
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		versionKeys: ['reportCards'],
	});
	return result ? id : null;
}
