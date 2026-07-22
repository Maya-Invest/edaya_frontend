import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ChapterImportClassAssignment } from '$lib/import/chapters/types';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface SaveChapterForGradeLevelSubjectInput {
	subjectId: string;
	gradeLevelSubjectId: string;
	matterId: string;
	name: string;
	description?: string;
	sequenceOrder: number;
	classAssignments: readonly ChapterImportClassAssignment[];
	createdAt?: string;
}

export interface SaveChapterForClassSubjectInput {
	subjectId: string;
	classSubjectId: string;
	classGroupId: string;
	gradeLevelSubjectId?: string;
	matterId: string;
	name: string;
	description?: string;
	sequenceOrder: number;
	createdAt?: string;
}

export function createChapterImportMatterId(
	index: number,
	seed = Date.now().toString(36),
): string {
	return `sm-${seed}-${index}`;
}

export async function saveChapterForGradeLevelSubject(
	client: SchoolClient,
	input: SaveChapterForGradeLevelSubjectInput,
): Promise<string> {
	const createdAt = input.createdAt ?? new Date().toISOString();
	const description = input.description?.trim() ?? '';

	await client.commands.configureSubjectMatter({
		id: input.matterId,
		subjectId: input.subjectId,
		name: input.name.trim(),
		description: description.length > 0 ? description : null,
		sequenceOrder: input.sequenceOrder,
		estimatedHours: null,
		createdAt,
	});

	if (input.classAssignments.length > 0) {
		const classSubjectMatterIdsByClassGroupId = Object.fromEntries(
			input.classAssignments.map(assignment => [
				assignment.classGroupId,
				`csm-${assignment.classSubjectId}-${input.matterId}`,
			]),
		);

		await client.commands.assignMatterToGradeLevelSubject({
			id: `glsm-${input.gradeLevelSubjectId}-${input.matterId}`,
			gradeLevelSubjectId: input.gradeLevelSubjectId,
			subjectMatterId: input.matterId,
			classSubjectMatterIdsByClassGroupId,
		});
	}

	return input.matterId;
}

/** Single-class path (UI drawer). Prefer {@link saveChapterForGradeLevelSubject} for catalogue batch import. */
export async function saveChapterForClassSubject(
	client: SchoolClient,
	input: SaveChapterForClassSubjectInput,
): Promise<string> {
	if (input.gradeLevelSubjectId) {
		return saveChapterForGradeLevelSubject(client, {
			matterId: input.matterId,
			subjectId: input.subjectId,
			gradeLevelSubjectId: input.gradeLevelSubjectId,
			name: input.name,
			description: input.description,
			sequenceOrder: input.sequenceOrder,
			createdAt: input.createdAt,
			classAssignments: [{
				classGroupId: input.classGroupId,
				classSubjectId: input.classSubjectId,
			}],
		});
	}

	const createdAt = input.createdAt ?? new Date().toISOString();
	const description = input.description?.trim() ?? '';

	await client.commands.configureSubjectMatter({
		id: input.matterId,
		subjectId: input.subjectId,
		name: input.name.trim(),
		description: description.length > 0 ? description : null,
		sequenceOrder: input.sequenceOrder,
		estimatedHours: null,
		createdAt,
	});

	const classSubjectMatterId = `csm-${input.classSubjectId}-${input.matterId}`;
	await client.commands.assignMatterToClassSubject({
		id: classSubjectMatterId,
		classSubjectId: input.classSubjectId,
		subjectMatterId: input.matterId,
	});

	return input.matterId;
}
