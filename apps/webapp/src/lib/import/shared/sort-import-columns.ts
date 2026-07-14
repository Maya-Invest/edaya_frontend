export function sortImportColumnsRequiredFirst<T extends { required: boolean }>(
	columns: readonly T[],
): T[] {
	const required: T[] = [];
	const optional: T[] = [];

	for (const column of columns) {
		if (column.required) {
			required.push(column);
		}
		else {
			optional.push(column);
		}
	}

	return [...required, ...optional];
}
