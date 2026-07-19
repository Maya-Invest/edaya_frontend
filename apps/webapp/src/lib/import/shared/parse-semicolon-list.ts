export function parseSemicolonList(value?: string): string[] {
	if (!value?.trim()) {
		return [];
	}

	return value
		.split(';')
		.map(part => part.trim())
		.filter(part => part.length > 0);
}
