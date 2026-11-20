import type { components } from '$lib/api/schema';
import { recordsForFieldIds } from '$lib/api/entity-list-filters';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { toCanonicalCatalogText } from '$lib/i18n/catalog-label';

type ClassSubjectRaw = components['schemas']['ClassSubject'];
type ClassSubjectMatterRaw = components['schemas']['ClassSubjectMatter'];
type SubjectMatterRaw = components['schemas']['SubjectMatter'];

export interface SubjectMatterDrawerRow {
	id: string;
	name: string;
	shortName?: string;
	description?: string;
	sequenceOrder: number;
	progressWeight?: number;
	estimatedHours?: number;
	classSubjectMatterId?: string;
	status?: ClassSubjectMatterRaw['status'];
	completedPercentage?: number;
	notes?: string | null;
	startedAt?: unknown;
	completedAt?: unknown;
	updatedByStaffId?: string | null;
}

export async function loadSubjectMatterDrawerRows(classSubjectId: string): Promise<{
	catalogSubjectId: string;
	subjectId: string;
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
		subjectId: classSubject.subjectId,
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
				shortName: matter.shortName,
				description: matter.description ?? undefined,
				sequenceOrder: matter.sequenceOrder,
				progressWeight: matter.progressWeight ?? 1,
				estimatedHours: matter.estimatedHours ?? undefined,
				classSubjectMatterId: link?.id,
				status: link?.status,
				completedPercentage: link?.completedPercentage ?? undefined,
				notes: link?.notes ?? null,
				startedAt: link?.startedAt,
				completedAt: link?.completedAt,
				updatedByStaffId: link?.updatedByStaffId ?? null,
			} satisfies SubjectMatterDrawerRow;
		});
}

/** Class progression remains independent; chapter definitions are managed on the subject. */
export async function loadTeachingSubjectProgressionRows(classSubjectId: string) {
	return { ...await loadSubjectMatterDrawerRows(classSubjectId), chaptersReadOnly: true };
}

export async function loadCatalogSubjectMatterRows(subjectId: string) {
	const client = getBrowserSchoolClient();
	const matters = await client.entities.subjectMatters.list({ subjectId }) ?? [];
	return { catalogSubjectId: subjectId, subjectId, classSubjectId: '', classGroupId: '', rows: mapSubjectMatterRows(matters, new Map()) };
}

export async function saveSubjectMatterMutation(input: {
	id?: string;
	subjectId: string;
	classSubjectId: string;
	classGroupId: string;
	name: string;
	shortName?: string;
	description?: string;
	sequenceOrder: number;
	progressWeight?: number;
	estimatedHours?: number;
	successMessage?: string;
}): Promise<SubjectMatterDrawerRow | null> {
	const client = getBrowserSchoolClient();
	const matterId = input.id ?? crypto.randomUUID();

	const saved = await runMutation(
		() => client.commands.configureSubjectMatter({
			id: matterId,
			subjectId: input.subjectId,
			name: toCanonicalCatalogText(input.name.trim()),
			shortName: input.shortName,
			description: input.description?.trim() || null,
			sequenceOrder: input.sequenceOrder,
			progressWeight: input.progressWeight,
			estimatedHours: input.estimatedHours ?? null,
		}),
		{ successMessage: input.successMessage, versionKeys: ['subjects'] },
	);

	if (!saved) {
		return null;
	}

	return {
		id: matterId,
		name: toCanonicalCatalogText(input.name.trim()),
		shortName: input.shortName,
		description: input.description?.trim() || undefined,
		sequenceOrder: input.sequenceOrder,
		progressWeight: input.progressWeight,
		estimatedHours: input.estimatedHours,
	};
}

export async function deleteSubjectMatterMutation(
	matterId: string,
	successMessage?: string,
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		async () => {
			await client.commands.removeSubjectMatter({ subjectMatterId: matterId });
			return true;
		},
		{ successMessage, versionKeys: ['subjects'] },
	);
	return result === true;
}
