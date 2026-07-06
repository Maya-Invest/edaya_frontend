import type { components } from '$lib/api/schema';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { recordsForFieldIds } from '$lib/api/entity-list-filters';

type SubjectMatterRaw = components['schemas']['SubjectMatter'];
type ClassSubjectRaw = components['schemas']['ClassSubject'];
type ClassSubjectMatterRaw = components['schemas']['ClassSubjectMatter'];

export interface SubjectMatterDrawerRow {
	id: string;
	name: string;
	description?: string;
	sequenceOrder: number;
	estimatedHours?: number;
	classSubjectMatterId?: string;
	status?: ClassSubjectMatterRaw['status'];
	completedPercentage?: number;
}

export async function loadSubjectMatterDrawerRows(classSubjectId: string): Promise<{
	catalogSubjectId: string;
	gradeLevelSubjectId?: string;
	classGroupId: string;
	rows: SubjectMatterDrawerRow[];
}> {
	const client = getBrowserSchoolClient();
	const classSubject = await client.entities.classSubjects.get(classSubjectId) as ClassSubjectRaw;
	const subjectMattersRaw = (await client.entities.subjectMatters.list({
		subjectId: classSubject.subjectId,
	})) ?? [];
	const classSubjectMattersRaw = (await client.entities.classSubjectMatters.list(
		recordsForFieldIds('classSubjectId', [classSubjectId]),
	)) ?? [];

	const linkByMatterId = new Map(
		classSubjectMattersRaw.map(link => [link.subjectMatterId, link]),
	);

	const rows = [...subjectMattersRaw]
		.sort((left, right) => left.sequenceOrder - right.sequenceOrder)
		.map((matter) => {
			const link = linkByMatterId.get(matter.id);
			return {
				id: matter.id,
				name: matter.name,
				description: matter.description ?? undefined,
				sequenceOrder: matter.sequenceOrder,
				estimatedHours: matter.estimatedHours ?? undefined,
				classSubjectMatterId: link?.id,
				status: link?.status,
				completedPercentage: link?.completedPercentage ?? undefined,
			} satisfies SubjectMatterDrawerRow;
		});

	return {
		catalogSubjectId: classSubject.subjectId,
		gradeLevelSubjectId: classSubject.gradeLevelSubjectId ?? undefined,
		classGroupId: classSubject.classGroupId,
		rows,
	};
}

export async function saveSubjectMatterMutation(input: {
	id?: string;
	subjectId: string;
	classSubjectId: string;
	classGroupId: string;
	gradeLevelSubjectId?: string;
	name: string;
	description?: string;
	sequenceOrder: number;
	estimatedHours?: number;
	successMessage?: string;
}): Promise<SubjectMatterDrawerRow | null> {
	const client = getBrowserSchoolClient();
	const matterId = input.id ?? `sm-${Date.now().toString(36)}`;
	const classSubjectMatterId = `csm-${input.classSubjectId}-${matterId}`;

	const saved = await runMutation(
		() => client.commands.configureSubjectMatter({
			id: matterId,
			subjectId: input.subjectId,
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

	if (input.gradeLevelSubjectId) {
		const linked = await runMutation(
			() => client.commands.assignMatterToGradeLevelSubject({
				id: `glsm-${input.gradeLevelSubjectId}-${matterId}`,
				gradeLevelSubjectId: input.gradeLevelSubjectId!,
				subjectMatterId: matterId,
				classSubjectMatterIdsByClassGroupId: {
					[input.classGroupId]: classSubjectMatterId,
				},
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
		classSubjectMatterId,
		status: 'not_started',
		completedPercentage: 0,
	};
}

export async function deleteSubjectMatterMutation(
	matterId: string,
	successMessage?: string,
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.entities.subjectMatters.delete({ id: matterId }),
		{ successMessage },
	);
	return result !== null;
}
