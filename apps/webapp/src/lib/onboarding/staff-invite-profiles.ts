import type { OnboardingStaffInviteRole } from '$lib/onboarding/types';

export interface OnboardingStaffInviteProfile {
	value: OnboardingStaffInviteRole;
	labelKey:
		| 'onboarding.staff.roleDeputyDirector'
		| 'onboarding.staff.roleCpe'
		| 'onboarding.staff.rolePortalTeacher'
		| 'onboarding.staff.roleSecretary';
}

export const ONBOARDING_STAFF_INVITE_PROFILES: readonly OnboardingStaffInviteProfile[] = [
	{ value: 'deputy_director', labelKey: 'onboarding.staff.roleDeputyDirector' },
	{ value: 'cpe', labelKey: 'onboarding.staff.roleCpe' },
	{ value: 'teacher', labelKey: 'onboarding.staff.rolePortalTeacher' },
	{ value: 'secretary', labelKey: 'onboarding.staff.roleSecretary' },
];

export function defaultStaffInviteRole(): OnboardingStaffInviteRole {
	return 'teacher';
}

export function createEmptyStaffInvite() {
	return {
		id: crypto.randomUUID(),
		email: '',
		role: defaultStaffInviteRole(),
	};
}
