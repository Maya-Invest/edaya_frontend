export type StudentGenderLabelKey = 'student.gender.male' | 'student.gender.female' | 'student.gender.other';

export function studentGenderLabelKey(value?: string | null): StudentGenderLabelKey | null {
	if (!value?.trim()) {
		return null;
	}

	const normalized = value.trim().toLowerCase();
	if (['m', 'male', 'masculin', 'homme', 'h'].includes(normalized)) {
		return 'student.gender.male';
	}
	if (['f', 'female', 'feminin', 'féminin', 'femme'].includes(normalized)) {
		return 'student.gender.female';
	}

	return 'student.gender.other';
}
