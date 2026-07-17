const GRADE_CLASS_PREFIX: Record<string, string> = {
	'gl-6': '6',
	'gl-5': '5',
	'gl-4': '4',
	'gl-3': '3',
	'gl-2': '2',
	'gl-1': '1st',
	'gl-t': 'term',
};

export function nextClassIdForImport(
	gradeLevelId: string,
	existingClassIds: ReadonlySet<string>,
	siblingCountByGrade: Map<string, number>,
): string {
	const prefix = GRADE_CLASS_PREFIX[gradeLevelId] ?? 'cls';
	let index = siblingCountByGrade.get(gradeLevelId) ?? 0;
	let id = index === 0 && prefix === '2' ? '2nd' : `${prefix}${String.fromCharCode(97 + index)}`;

	while (existingClassIds.has(id)) {
		index += 1;
		id = `${prefix}${String.fromCharCode(97 + index)}`;
	}

	siblingCountByGrade.set(gradeLevelId, index + 1);
	return id;
}
