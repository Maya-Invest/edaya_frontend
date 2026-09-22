export function academicScopeIdentity(schoolScopeId: string, yearId: string, periodId: string): string {
	return `${schoolScopeId}|${yearId}|${periodId}`;
}

export function academicScopeCacheSegment(schoolScopeId: string, yearId: string, periodId: string): string {
	return [schoolScopeId, yearId, periodId].filter(Boolean).join('|');
}

export function nextAcademicScopeGeneration(
	previousIdentity: string,
	nextIdentity: string,
	generation: number,
): { generation: number; changed: boolean } {
	if (previousIdentity === nextIdentity) {
		return { generation, changed: false };
	}
	return { generation: generation + 1, changed: true };
}
