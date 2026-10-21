import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ChapterImportClassAssignment } from '$lib/import/chapters/types';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
export interface SaveChapterForSubjectInput {
	subjectId: string;
	matterId: string;
	name: string;
	description?: string;
	sequenceOrder: number;
	classAssignments?: readonly ChapterImportClassAssignment[];
	classSubjectId?: string;
	classGroupId?: string;
	createdAt?: string;
}
export function createChapterImportMatterId(index: number, seed = Date.now().toString(36)): string {
	return `sm-${seed}-${index}`;
}
export async function saveChapterForSubject(client: SchoolClient, input: SaveChapterForSubjectInput): Promise<string> {
	await client.commands.configureSubjectMatter({ id: input.matterId, subjectId: input.subjectId, name: input.name.trim(), description: input.description?.trim() || null, sequenceOrder: input.sequenceOrder, estimatedHours: null, createdAt: input.createdAt ?? new Date().toISOString() });
	return input.matterId;
}
