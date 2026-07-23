import {
	nextClassGroupId,
	resolveGradeLevelKeyForClassId,
} from '$lib/school/next-class-group-id';

export function nextClassIdForImport(
	gradeLevelId: string,
	existingClassIds: ReadonlySet<string>,
	siblingCountByGrade: Map<string, number>,
	gradeLevelName?: string,
): string {
	const key = resolveGradeLevelKeyForClassId(gradeLevelId, gradeLevelName);
	return nextClassGroupId(key, existingClassIds, siblingCountByGrade);
}
