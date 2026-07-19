import type { Subject, SubjectCategory } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { schoolSubjectsCatalogList } from '$lib/api/entity-list-filters';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { buildSubjectConfigCommand } from '$lib/api/subject-save-payload';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { navigateToListAfterEntityDelete } from '$lib/navigation/navigate-after-delete';
import { getCatalogSubjects } from '$lib/queries/subjects.queries';
import { notifySubjectsListChanged } from '$lib/subjects/notify-subjects-list-changed';
import { toast } from '$lib/toast.svelte';
import { t } from '$lib/i18n';
import { get } from 'svelte/store';
import { ApiError } from '@maya-invest/edaya-api-client';

export interface CatalogSubjectMatterRow {
	id: string;
	name: string;
	description?: string;
	sequenceOrder: number;
	estimatedHours?: number;
}

export interface CatalogSubjectDrawerContext {
	gradeLevelSubjectId: string;
	subjectId: string;
	gradeLevelId: string;
	classSubjectsByClassGroupId: Record<string, string>;
}

async function resolveClassSubjectsByClassGroupId(
	gradeLevelSubjectId: string,
	subjectId: string,
	gradeLevelId: string,
): Promise<Record<string, string>> {
	const client = getBrowserSchoolClient();
	const classGroupIds = new Set(
		academicContext.classes
			.filter(entry => entry.gradeLevelId === gradeLevelId)
			.map(entry => entry.id),
	);
	if (classGroupIds.size === 0) {
		return {};
	}

	const classSubjectsRaw = (await client.entities.classSubjects.list(schoolSubjectsCatalogList())) ?? [];
	const classSubjectsByClassGroupId: Record<string, string> = {};
	for (const classSubject of classSubjectsRaw) {
		if (!classGroupIds.has(classSubject.classGroupId)) {
			continue;
		}
		if (
			classSubject.gradeLevelSubjectId === gradeLevelSubjectId
			|| classSubject.subjectId === subjectId
		) {
			classSubjectsByClassGroupId[classSubject.classGroupId] = classSubject.id;
		}
	}
	return classSubjectsByClassGroupId;
}

export async function loadCatalogSubjectDrawerData(gradeLevelSubjectId: string): Promise<{
	context: CatalogSubjectDrawerContext;
	matters: CatalogSubjectMatterRow[];
} | null> {
	const client = getBrowserSchoolClient();
	let gradeLevelSubject;
	try {
		gradeLevelSubject = await client.entities.gradeLevelSubjects.get(gradeLevelSubjectId);
	}
	catch (error) {
		if (error instanceof ApiError && error.status === 404) {
			return null;
		}
		throw error;
	}
	const subjectMattersRaw = (await client.entities.subjectMatters.list({
		subjectId: gradeLevelSubject.subjectId,
	})) ?? [];
	const classSubjectsByClassGroupId = await resolveClassSubjectsByClassGroupId(
		gradeLevelSubjectId,
		gradeLevelSubject.subjectId,
		gradeLevelSubject.gradeLevelId,
	);

	const matters = [...subjectMattersRaw]
		.sort((left, right) => left.sequenceOrder - right.sequenceOrder)
		.map(matter => ({
			id: matter.id,
			name: matter.name,
			description: matter.description ?? undefined,
			sequenceOrder: matter.sequenceOrder,
			estimatedHours: matter.estimatedHours ?? undefined,
		}));

	return {
		context: {
			gradeLevelSubjectId,
			subjectId: gradeLevelSubject.subjectId,
			gradeLevelId: gradeLevelSubject.gradeLevelId,
			classSubjectsByClassGroupId,
		},
		matters,
	};
}

export async function updateCatalogSubjectMutation(input: {
	gradeLevelSubjectId: string;
	name: string;
	category: SubjectCategory;
	color: Subject['color'];
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	let subject;
	try {
		const gradeLevelSubject = await client.entities.gradeLevelSubjects.get(input.gradeLevelSubjectId);
		subject = await client.entities.subjects.get(gradeLevelSubject.subjectId);
	}
	catch {
		toast.error(get(t)('dataState.errorDescription'));
		return false;
	}

	const result = await runMutation(
		() => client.commands.configureSubject(
			buildSubjectConfigCommand(subject, {
				id: subject.id,
				name: input.name,
				category: input.category,
				color: input.color,
			}),
		),
		{
			successMessage: input.successMessage,
			onSuccess: async () => {
				detailDataContext.patchCatalogSubject(input.gradeLevelSubjectId, {
					name: input.name.trim(),
					category: input.category,
					color: input.color,
				});
				await getCatalogSubjects();
			},
		},
	);
	return result !== null;
}

export async function deleteCatalogSubjectMutation(
	gradeLevelSubjectId: string,
	opts?: { successMessage?: string },
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = detailDataContext.catalogSubjects.find(entry => entry.id === gradeLevelSubjectId);
	const result = await runMutation(
		() => client.commands.removeSubjectFromGradeLevel({ gradeLevelSubjectId }),
		{
			successMessage: opts?.successMessage,
			refresh: true,
			apply: () => detailDataContext.removeCatalogSubject(gradeLevelSubjectId),
			rollback: () => {
				if (previous) {
					detailDataContext.seedCatalogSubjects(
						[...detailDataContext.catalogSubjects, previous].sort((left, right) =>
							left.name.localeCompare(right.name, 'fr'),
						),
					);
				}
			},
			onSuccess: async () => {
				notifySubjectsListChanged();
				await navigateToListAfterEntityDelete();
				await getCatalogSubjects();
			},
		},
	);
	return result !== null;
}

export async function saveCatalogSubjectMatterMutation(input: {
	id?: string;
	context: CatalogSubjectDrawerContext;
	name: string;
	description?: string;
	sequenceOrder: number;
	estimatedHours?: number;
	successMessage?: string;
}): Promise<CatalogSubjectMatterRow | null> {
	const client = getBrowserSchoolClient();
	const matterId = input.id ?? `sm-${Date.now().toString(36)}`;

	const saved = await runMutation(
		() => client.commands.configureSubjectMatter({
			id: matterId,
			subjectId: input.context.subjectId,
			name: input.name.trim(),
			description: input.description?.trim() || null,
			sequenceOrder: input.sequenceOrder,
			estimatedHours: input.estimatedHours ?? null,
		}),
		{ successMessage: input.successMessage },
	);
	if (!saved) {
		return null;
	}

	const classSubjectMatterIdsByClassGroupId = Object.fromEntries(
		Object.entries(input.context.classSubjectsByClassGroupId).map(([classGroupId, classSubjectId]) => [
			classGroupId,
			`csm-${classSubjectId}-${matterId}`,
		]),
	);

	if (Object.keys(classSubjectMatterIdsByClassGroupId).length > 0) {
		const linked = await runMutation(
			() => client.commands.assignMatterToGradeLevelSubject({
				id: `glsm-${input.context.gradeLevelSubjectId}-${matterId}`,
				gradeLevelSubjectId: input.context.gradeLevelSubjectId,
				subjectMatterId: matterId,
				classSubjectMatterIdsByClassGroupId,
			}),
			{},
		);
		if (!linked) {
			return null;
		}
	}

	return {
		id: matterId,
		name: input.name.trim(),
		description: input.description?.trim() || undefined,
		sequenceOrder: input.sequenceOrder,
		estimatedHours: input.estimatedHours,
	};
}
