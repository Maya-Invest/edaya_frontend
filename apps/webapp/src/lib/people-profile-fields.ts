import { dateInputToIso, formatDateInput } from '$lib/date/format';

export type PersonKind = 'student' | 'teacher' | 'staff' | 'guardian';
export interface PersonField {
	key: string;
	labelKey: string;
	type?: 'date' | 'text';
}
const original: PersonField = { key: 'sourceFullName', labelKey: 'profile.sourceFullName' };
const code: PersonField = { key: 'code', labelKey: 'common.code' };
export const PERSON_PROFILE_FIELDS: Record<PersonKind, PersonField[]> = {
	student: [original, { key: 'matricule', labelKey: 'profile.matricule' }, { key: 'nationalMatricule', labelKey: 'profile.nationalMatricule' }, { key: 'gender', labelKey: 'profile.gender' }, { key: 'placeOfBirth', labelKey: 'profile.placeOfBirth' }, { key: 'nationality', labelKey: 'profile.nationality' }, { key: 'enrollmentDate', labelKey: 'profile.enrollmentDate', type: 'date' }],
	teacher: [code, original],
	staff: [code, { key: 'phone', labelKey: 'common.phone' }],
	guardian: [code, original, { key: 'occupation', labelKey: 'profile.occupation' }],
};
export function personFieldDraft(kind: PersonKind, person: object = {}): Record<string, string> {
	const data = Object.fromEntries(Object.entries(person));
	return Object.fromEntries(PERSON_PROFILE_FIELDS[kind].map(field => [field.key, typeof data[field.key] === 'string' ? (field.type === 'date' ? data[field.key].slice(0, 10) : data[field.key]) : '']));
}
function optional(values: Record<string, string> | undefined, field: string) {
	if (!values || !(field in values))
		return undefined;
	const value = values[field] ?? '';
	return value.trim() ? (field === 'sourceFullName' ? value : value.trim()) : null;
}
function supplied<T extends object>(values: T): Partial<T> {
	return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as Partial<T>;
}
export function studentIdentityPayload(values?: Record<string, string>, previous?: { enrollmentDate?: string | null }) {
	return supplied({
		matricule: optional(values, 'matricule'),
		nationalMatricule: optional(values, 'nationalMatricule'),
		gender: optional(values, 'gender'),
		sourceFullName: optional(values, 'sourceFullName'),
		placeOfBirth: optional(values, 'placeOfBirth'),
		nationality: optional(values, 'nationality'),
		enrollmentDate: values && 'enrollmentDate' in values && (!previous || values.enrollmentDate !== formatDateInput(previous.enrollmentDate)) ? dateInputToIso(values.enrollmentDate ?? '') ?? null : undefined,
	});
}
export function teacherIdentityPayload(values?: Record<string, string>) {
	return supplied({ code: optional(values, 'code'), sourceFullName: optional(values, 'sourceFullName') });
}
export function guardianIdentityPayload(values?: Record<string, string>) {
	return supplied({ ...teacherIdentityPayload(values), occupation: optional(values, 'occupation') });
}
