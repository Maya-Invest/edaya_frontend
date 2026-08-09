/**
 * Class names for QA fixtures, built exactly like the product builds them:
 * the stem is `grade_levels.label` (never inferred from the level name), and
 * only the suffix style is read from the classes the school already has.
 */
import type { SchoolGradeLevel, SchoolImportSnapshot } from './school-db.ts';

export type ClassNamingMode = 'alphabetical' | 'numerical';

const CLASS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;
const SINGLE_LETTER = /^[a-z]$/i;

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

function classNamesForLevel(snapshot: SchoolImportSnapshot, level: SchoolGradeLevel): string[] {
	return snapshot.classes
		.filter(entry => entry.niveau === level.name)
		.map(entry => entry.name);
}

/**
 * Suffix style already in use on this level. Numerical when the level has no
 * class yet, which matches the product default.
 */
export function suffixStyleForLevel(
	snapshot: SchoolImportSnapshot,
	level: SchoolGradeLevel,
): ClassNamingMode {
	const names = classNamesForLevel(snapshot, level);
	if (names.length === 0) {
		return 'numerical';
	}

	const suffixes = names
		.filter(name => name.startsWith(level.label))
		.map(name => name.slice(level.label.length).trim())
		.filter(suffix => suffix.length > 0);

	if (suffixes.length === 0) {
		throw new Error(
			`Grade level "${level.name}" has classes (${names.join(', ')}) but none starts with its label "${level.label}". `
			+ 'Re-seed the local DB after the label migration, or fix the label in Configuration → Grade levels, '
			+ 'then regenerate the fixtures.',
		);
	}

	return suffixes.every(suffix => SINGLE_LETTER.test(suffix)) ? 'alphabetical' : 'numerical';
}

/**
 * The next `count` class names for a level, continuing its series past every
 * name already in the database.
 */
export function nextFreeClassNames(
	snapshot: SchoolImportSnapshot,
	level: SchoolGradeLevel,
	count: number,
): string[] {
	const mode = suffixStyleForLevel(snapshot, level);
	const taken = new Set(snapshot.classes.map(entry => entry.name.trim().toLowerCase()));
	const names: string[] = [];

	for (let index = 0; names.length < count; index += 1) {
		if (index > taken.size + count + CLASS_LETTERS.length) {
			throw new Error(`Could not find ${count} free class names for level "${level.name}".`);
		}
		const candidate = classNameFromLabel(level.label, index, mode);
		if (taken.has(candidate.trim().toLowerCase())) {
			continue;
		}
		taken.add(candidate.trim().toLowerCase());
		names.push(candidate);
	}

	return names;
}
