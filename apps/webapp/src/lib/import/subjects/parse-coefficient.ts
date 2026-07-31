export function parseSubjectCoefficient(value?: string): number | null | undefined {
	if (!value?.trim()) {
		return undefined;
	}
	const parsed = Number(value.trim().replace(',', '.'));
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null;
	}
	return parsed;
}
