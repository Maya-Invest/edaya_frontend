/** Sous-titre picker : « 3ème A · CI-2025-001 » (classe puis identifier). */
export function studentPickerSubtitle(input: {
	classLabel?: string | null;
	classId?: string;
	identifier?: string | null;
}): string {
	const classPart = input.classLabel?.trim() || input.classId?.trim() || '';
	const identifier = input.identifier?.trim() || '';

	if (classPart && identifier) {
		return `${classPart} · ${identifier}`;
	}

	return classPart || identifier;
}

export function studentPickerSearchText(input: {
	email?: string;
	classLabel?: string | null;
	classId?: string;
	identifier?: string | null;
}): string {
	return [
		input.email,
		input.classLabel,
		input.classId,
		input.identifier?.trim(),
	].filter(Boolean).join(' ');
}
