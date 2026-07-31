export function parseChapterSequenceOrder(value: string | undefined): number | null {
	if (!value?.trim()) {
		return 1;
	}

	const parsed = Number(value.trim());
	if (!Number.isInteger(parsed) || parsed < 1) {
		return null;
	}

	return parsed;
}
