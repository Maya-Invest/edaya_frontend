export interface ImportValidationResultWithValidRows {
	validRows: readonly unknown[];
}

/** Import is allowed when at least one row passed validation; errored rows are excluded. */
export function canImportValidatedRows(result: ImportValidationResultWithValidRows | null): boolean {
	return result != null && result.validRows.length > 0;
}
