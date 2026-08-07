import type { ClassNamingMode } from '$lib/onboarding/class-naming';
import { classNameFromLabel } from '$lib/onboarding/class-naming';

const SINGLE_LETTER = /^[a-z]$/i;

/** Alphabetical only when every existing sibling already uses a single letter; numerical otherwise. */
function suffixStyle(label: string, siblingNames: readonly string[]): ClassNamingMode {
	const suffixes = siblingNames
		.filter(name => name.startsWith(label))
		.map(name => name.slice(label.length).trim())
		.filter(suffix => suffix.length > 0);

	if (suffixes.length === 0) {
		return 'numerical';
	}
	return suffixes.every(suffix => SINGLE_LETTER.test(suffix)) ? 'alphabetical' : 'numerical';
}

/**
 * Next free class name for a grade level: the level label plus a suffix
 * continuing the pattern its existing classes already use.
 */
export function suggestNextClassName(label: string, siblingNames: readonly string[]): string {
	const trimmedLabel = label.trim();
	if (!trimmedLabel) {
		return '';
	}

	const mode = suffixStyle(trimmedLabel, siblingNames);
	const taken = new Set(siblingNames);
	for (let index = 0; index < siblingNames.length + 1; index += 1) {
		const candidate = classNameFromLabel(trimmedLabel, index, mode);
		if (!taken.has(candidate)) {
			return candidate;
		}
	}
	return classNameFromLabel(trimmedLabel, siblingNames.length, mode);
}
