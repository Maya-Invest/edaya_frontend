/** Mirrors backend `classNameFromLabel` — level short label + alphabetical/numerical increment. */
export type ClassNamingMode = 'alphabetical' | 'numerical';

const CLASS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;

export function classNameFromLabel(
	label: string,
	index: number,
	mode: ClassNamingMode = 'numerical',
): string {
	if (mode === 'alphabetical') {
		const letter = CLASS_LETTERS[index];
		if (letter) {
			return `${label} ${letter}`;
		}
	}
	return `${label} ${index + 1}`;
}

export function previewClassNamesFromCatalog(
	level: Pick<{ shortLabel: string }, 'shortLabel'>,
	classCount: number,
	mode: ClassNamingMode = 'numerical',
): string[] {
	return Array.from(
		{ length: Math.max(0, classCount) },
		(_, index) => classNameFromLabel(level.shortLabel, index, mode),
	);
}
