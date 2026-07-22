import type { ImportMultiValueSeparator } from '$lib/import/preferences/import-preferences.svelte';

export function parseMultiValueList(
	value: string | undefined,
	separator: ImportMultiValueSeparator,
): string[] {
	if (!value?.trim()) {
		return [];
	}

	return value
		.split(separator)
		.map(part => part.trim())
		.filter(part => part.length > 0);
}

/** @deprecated Use {@link parseMultiValueList} with an explicit separator. */
export function parseSemicolonList(value?: string): string[] {
	return parseMultiValueList(value, ';');
}
