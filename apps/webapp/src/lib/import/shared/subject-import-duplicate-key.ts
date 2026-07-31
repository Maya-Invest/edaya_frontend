export function subjectImportDuplicateKey(gradeLevelId: string, subjectName: string): string {
	return `${gradeLevelId}::${subjectName.trim().toLowerCase()}`;
}
