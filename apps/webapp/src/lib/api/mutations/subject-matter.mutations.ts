import type { components } from '$lib/api/schema';
import { recordsForFieldIds } from '$lib/api/entity-list-filters';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';

type ClassSubjectRaw = components['schemas']['ClassSubject'];
type ClassSubjectMatterRaw = components['schemas']['ClassSubjectMatter'];
type GradeLevelSubjectRaw = components['schemas']['GradeLevelSubject'];
type SubjectMatterRaw = components['schemas']['SubjectMatter'];

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

	const rows = mapSubjectMatterRows(subjectMattersRaw, linkByMatterId);

	return {
		catalogSubjectId: classSubject.subjectId,
		gradeLevelSubjectId: classSubject.gradeLevelSubjectId ?? undefined,
		classGroupId: classSubject.classGroupId,
		rows,
	};
}

function mapSubjectMatterRows(
	subjectMattersRaw: SubjectMatterRaw[],
	linkByMatterId: Map<string, ClassSubjectMatterRaw>,
): SubjectMatterDrawerRow[] {
	return [...subjectMattersRaw]
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
}

/** Classes → Leçons : chapitres catalogue (niveau) en lecture seule quand la matière de classe est liée au catalogue. */
export async function loadTeachingSubjectProgressionRows(classSubjectId: string): Promise<{
	catalogSubjectId: string;
	gradeLevelSubjectId?: string;
	classGroupId: string;
	rows: SubjectMatterDrawerRow[];
	chaptersReadOnly: boolean;
}> {
	const client = getBrowserSchoolClient();
	const classSubject = await client.entities.classSubjects.get(classSubjectId) as ClassSubjectRaw;
	const gradeLevelSubjectId = classSubject.gradeLevelSubjectId ?? undefined;

	if (!gradeLevelSubjectId) {
		const loaded = await loadSubjectMatterDrawerRows(classSubjectId);
		return { ...loaded, chaptersReadOnly: false };
	}

	const gradeLevelSubject = await client.entities.gradeLevelSubjects.get(gradeLevelSubjectId) as GradeLevelSubjectRaw;
	const subjectMattersRaw = (await client.entities.subjectMatters.list({
		subjectId: gradeLevelSubject.subjectId,
	})) ?? [];
	const classSubjectMattersRaw = (await client.entities.classSubjectMatters.list(
		recordsForFieldIds('classSubjectId', [classSubjectId]),
	)) ?? [];

	const linkByMatterId = new Map(
		classSubjectMattersRaw.map(link => [link.subjectMatterId, link]),
	);

	return {
		catalogSubjectId: gradeLevelSubject.subjectId,
		gradeLevelSubjectId,
		classGroupId: classSubject.classGroupId,
		rows: mapSubjectMatterRows(subjectMattersRaw, linkByMatterId),
		chaptersReadOnly: true,
	};
}

export async function loadCatalogSubjectMatterRows(gradeLevelSubjectId: string): Promise<{
	catalogSubjectId: string;
	gradeLevelSubjectId: string;
	classSubjectId: string;
	classGroupId: string;
	rows: SubjectMatterDrawerRow[];
}> {
	const client = getBrowserSchoolClient();
	const gradeLevelSubject = await client.entities.gradeLevelSubjects.get(gradeLevelSubjectId) as GradeLevelSubjectRaw;
	const subjectMattersRaw = (await client.entities.subjectMatters.list({
		subjectId: gradeLevelSubject.subjectId,
	})) ?? [];
	const classSubjects = (await client.entities.classSubjects.list({
		gradeLevelSubjectId,
	})) ?? [];
	const representative = classSubjects[0] as ClassSubjectRaw | undefined;

	const rows = [...subjectMattersRaw]
		.sort((left, right) => left.sequenceOrder - right.sequenceOrder)
		.map(matter => ({
			id: matter.id,
			name: matter.name,
			description: matter.description ?? undefined,
			sequenceOrder: matter.sequenceOrder,
			estimatedHours: matter.estimatedHours ?? undefined,
		} satisfies SubjectMatterDrawerRow));

	return {
		catalogSubjectId: gradeLevelSubject.subjectId,
		gradeLevelSubjectId,
		classSubjectId: representative?.id ?? gradeLevelSubjectId,
		classGroupId: representative?.classGroupId ?? '',
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
	else {
		const linked = await runMutation(
			() => client.commands.assignMatterToClassSubject({
				id: classSubjectMatterId,
				classSubjectId: input.classSubjectId,
				subjectMatterId: matterId,
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
