/** Mirrors backend `classDisplayName` — fixture `code` + alphabetical/numerical increment. */
export type ClassNamingMode = 'alphabetical' | 'numerical';

const CLASS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;

export function previewClassNamesFromCatalog(
	level: Pick<{ code: string; shortLabel: string }, 'code' | 'shortLabel'>,
	classCount: number,
	mode: ClassNamingMode = 'numerical',
): string[] {
	const stem = level.code || level.shortLabel;
	return Array.from({ length: Math.max(0, classCount) }, (_, index) => {
		if (mode === 'alphabetical') {
			const letter = CLASS_LETTERS[index];
			if (letter) {
				return `${stem} ${letter}`;
			}
			return `${stem} ${index + 1}`;
		}
		return `${stem} ${index + 1}`;
	});
}
