import type { getBrowserSchoolClient } from '$lib/api/school-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

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
	classSubjectId: string,
	seed = Date.now().toString(36),
): string {
	return `sm-${seed}-${index}-${classSubjectId.slice(-4)}`;
}

export async function saveChapterForClassSubject(
	client: SchoolClient,
	input: SaveChapterForClassSubjectInput,
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

	if (input.gradeLevelSubjectId) {
		const classSubjectMatterId = `csm-${input.classSubjectId}-${input.matterId}`;
		await client.commands.assignMatterToGradeLevelSubject({
			id: `glsm-${input.gradeLevelSubjectId}-${input.matterId}`,
			gradeLevelSubjectId: input.gradeLevelSubjectId,
			subjectMatterId: input.matterId,
			classSubjectMatterIdsByClassGroupId: {
				[input.classGroupId]: classSubjectMatterId,
			},
		});
	}

	return input.matterId;
}
