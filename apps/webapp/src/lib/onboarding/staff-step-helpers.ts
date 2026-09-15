import type { OnboardingStaffInviteDraft } from '$lib/onboarding/types';
import { defaultStaffInviteRole } from '$lib/onboarding/staff-invite-profiles';
import { activeStaffInvites, isValidStaffInviteEmail } from '$lib/onboarding/staff-step-validation';

export function addStaffInvite(invites: OnboardingStaffInviteDraft[]): OnboardingStaffInviteDraft[] {
	return [
		...invites,
		{
			id: crypto.randomUUID(),
			email: '',
			role: defaultStaffInviteRole(),
		},
	];
}

export function removeStaffInvite(
	invites: OnboardingStaffInviteDraft[],
	id: string,
): OnboardingStaffInviteDraft[] {
	return invites.filter(invite => invite.id !== id);
}

export function updateStaffInvite(
	invites: OnboardingStaffInviteDraft[],
	id: string,
	patch: Partial<Pick<OnboardingStaffInviteDraft, 'email' | 'role'>>,
): OnboardingStaffInviteDraft[] {
	return invites.map(invite =>
		invite.id === id ? { ...invite, ...patch } : invite);
}

export function staffInvitesForSubmit(invites: OnboardingStaffInviteDraft[]) {
	return activeStaffInvites(invites)
		.filter(invite => isValidStaffInviteEmail(invite.email) && invite.role)
		.map(invite => ({
			email: invite.email.trim(),
			role: invite.role as Exclude<typeof invite.role, ''>,
		}));
}
