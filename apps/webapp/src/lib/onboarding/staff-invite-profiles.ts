import type { OnboardingStaffInviteRole } from '$lib/onboarding/types';

export interface OnboardingStaffInviteProfile {
	value: OnboardingStaffInviteRole;
	labelKey:
		| 'onboarding.staff.roleDeputyDirector'
		| 'onboarding.staff.roleCpe'
		| 'onboarding.staff.roleSecretary'
		| 'onboarding.staff.roleStudiesDirector'
		| 'onboarding.staff.roleItAdmin'
		| 'onboarding.staff.roleAccountant';
}

export const ONBOARDING_STAFF_INVITE_PROFILES: readonly OnboardingStaffInviteProfile[] = [
	{ value: 'deputy_director', labelKey: 'onboarding.staff.roleDeputyDirector' },
	{ value: 'studies_director', labelKey: 'onboarding.staff.roleStudiesDirector' },
	{ value: 'cpe', labelKey: 'onboarding.staff.roleCpe' },
	{ value: 'secretary', labelKey: 'onboarding.staff.roleSecretary' },
	{ value: 'accountant', labelKey: 'onboarding.staff.roleAccountant' },
	{ value: 'it_admin', labelKey: 'onboarding.staff.roleItAdmin' },
];

export function defaultStaffInviteRole(): OnboardingStaffInviteRole {
	return 'secretary';
}

export function createEmptyStaffInvite() {
	return {
		id: crypto.randomUUID(),
		email: '',
		role: defaultStaffInviteRole(),
	};
}
