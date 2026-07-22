import type { ImportTypeDefinition } from './types';

export function importTypeHasMultiValueColumns(definition: ImportTypeDefinition): boolean {
	return definition.columns.some(column => column.multiValue);
}
