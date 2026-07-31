/** Sous-titre picker : « 3ème A · CI-2025-001 » (classe puis matricule). */
export function studentPickerSubtitle(input: {
	classLabel?: string | null;
	classId?: string;
	matricule?: string | null;
}): string {
	const classPart = input.classLabel?.trim() || input.classId?.trim() || '';
	const matricule = input.matricule?.trim() || '';

	if (classPart && matricule) {
		return `${classPart} · ${matricule}`;
	}

	return classPart || matricule;
}

export function studentPickerSearchText(input: {
	email?: string;
	classLabel?: string | null;
	classId?: string;
	matricule?: string | null;
}): string {
	return [
		input.email,
		input.classLabel,
		input.classId,
		input.matricule?.trim(),
	].filter(Boolean).join(' ');
}
