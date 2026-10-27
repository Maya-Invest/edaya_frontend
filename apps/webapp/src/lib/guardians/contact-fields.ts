import type { components } from '$lib/api/schema';

type ContactFields = Pick<components['schemas']['Guardian'], 'phone' | 'alternativePhone' | 'email' | 'emailNotificationsEnabled' | 'smsNotificationsEnabled' | 'pushNotificationsEnabled'>;
export interface GuardianContactDraft {
	phone: string;
	alternativePhone: string;
	email: string;
	emailNotificationsEnabled: boolean;
	smsNotificationsEnabled: boolean;
	pushNotificationsEnabled: boolean;
}
export function guardianContactDraft(value?: Partial<ContactFields>): GuardianContactDraft {
	return {
		phone: value?.phone ?? '',
		alternativePhone: value?.alternativePhone ?? '',
		email: value?.email ?? '',
		emailNotificationsEnabled: value?.emailNotificationsEnabled ?? true,
		smsNotificationsEnabled: value?.smsNotificationsEnabled ?? true,
		pushNotificationsEnabled: value?.pushNotificationsEnabled ?? true,
	};
}
export function guardianContactPayload(value: GuardianContactDraft) {
	return { ...value, phone: value.phone.trim() || null, alternativePhone: value.alternativePhone.trim() || null, email: value.email.trim() || null };
}
