export function pruneStaffAssignmentPermissions<T extends string>(
	permissions: readonly T[],
	allowed: ReadonlySet<string>,
): T[] | null {
	const pruned = permissions.filter(permission => allowed.has(permission));
	return pruned.length !== permissions.length ? pruned : null;
}

export function staffAssignmentCanSubmit(input: {
	responsibility: string;
	classGroupId: string;
	targetKind: 'class_group' | 'class_subject';
	classSubjectId: string;
}): boolean {
	return input.responsibility.trim().length > 0
		&& input.classGroupId.length > 0
		&& (input.targetKind === 'class_group' || input.classSubjectId.length > 0);
}

export function classGroupStaffAssignmentCanSubmit(input: {
	responsibility: string;
	staffId: string;
}): boolean {
	return input.responsibility.trim().length > 0 && input.staffId.length > 0;
}
