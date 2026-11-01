import type { GuardianNotificationSettings } from '$lib/api/account-data';
import type { AccountActor, SessionKind } from '$lib/auth/account-actor';
import type { ActionGrantsSnapshot, SessionSnapshot, StaffSchoolMembership } from '$lib/auth/types';
import type { ServerOnboardingAccountStatus } from '$lib/onboarding/types';
import type { StaffMember } from '$lib/types/school';
import { browser } from '$app/environment';
import { academicContext } from '$lib/academic/context.svelte';
import { clearAuthGate } from '$lib/auth/auth-gate';
import {
	clearOnboardingSummaryHold,
	clearWizardCompletedInSession,
} from '$lib/onboarding/wizard-completion-flag';
import { authPrincipalChanged } from './access-token';
import { accessTokens } from './bearer-fetch';
import { authClient } from './client';

class AuthSession {
	userId = $state<string | null>(null);
	authUserId = $state<string | null>(null);
	needsOnboarding = $state(false);
	serverOnboardingStatus = $state<ServerOnboardingAccountStatus | null>(null);
	onboardingStatusUnknown = $state(false);
	schoolId = $state<string | null>(null);
	sessionKind = $state<SessionKind | null>(null);
	subjectId = $state<string | null>(null);
	loginEmail = $state<string | null>(null);
	notificationEmail = $state<string | null>(null);
	notificationPhone = $state<string | null>(null);
	userProfile = $state<StaffMember | null>(null);
	guardianSettings = $state<GuardianNotificationSettings | null>(null);
	grants = $state<ActionGrantsSnapshot | null>(null);
	staffMemberships = $state<StaffSchoolMembership[]>([]);
	ready = $state(!browser);

	get isLoggedIn(): boolean {
		return Boolean(this.grants && this.userId);
	}

	get hasAuthAccount(): boolean {
		return Boolean(this.authUserId);
	}

	user = $derived.by((): StaffMember | null => {
		return this.userProfile;
	});

	accountActor = $derived.by((): AccountActor | null => {
		if (!this.userId || !this.sessionKind) {
			return null;
		}
		if (this.sessionKind === 'guardian') {
			const name = this.guardianSettings?.name ?? 'Guardian';
			return {
				id: this.userId,
				kind: 'guardian',
				name,
				initials: this.guardianSettings?.initials ?? name.slice(0, 2).toUpperCase(),
				subtitleKey: 'account.kind.guardian',
				subjectId: this.subjectId,
			};
		}
		if (this.sessionKind === 'staff') {
			return {
				id: this.userId,
				kind: 'staff',
				name: this.userProfile?.name ?? 'Staff',
				initials: this.userProfile?.initials ?? 'ST',
				photoUrl: this.userProfile?.photoUrl ?? null,
				subtitleKey: this.grants?.some(grant => grant.source === 'owner')
					? 'staff.role.owner'
					: this.userProfile
						? `staff.role.${this.userProfile.role}`
						: 'staff.role.staff',
				subjectId: this.subjectId,
				email: this.userProfile?.email,
			};
		}
		return null;
	});

	school = $derived.by(() => {
		if (!this.schoolId) {
			return null;
		}
		return academicContext.schools.find(entry => entry.id === this.schoolId) ?? null;
	});

	activeStaffMembership = $derived.by(() => {
		if (!this.schoolId) {
			return null;
		}
		return this.staffMemberships.find(entry => entry.schoolId === this.schoolId) ?? null;
	});

	markLoading() {
		this.ready = false;
	}

	markReady() {
		this.ready = true;
	}

	setPendingOnboarding(options: { authUserId: string; loginEmail: string | null }) {
		if (authPrincipalChanged(this.authUserId, options.authUserId)) {
			accessTokens.clear();
		}
		this.authUserId = options.authUserId;
		this.needsOnboarding = true;
		this.serverOnboardingStatus = null;
		this.onboardingStatusUnknown = false;
		this.loginEmail = options.loginEmail;
		this.userId = null;
		this.schoolId = null;
		this.sessionKind = null;
		this.subjectId = null;
		this.notificationEmail = null;
		this.notificationPhone = null;
		this.userProfile = null;
		this.guardianSettings = null;
		this.grants = null;
		this.staffMemberships = [];
		this.ready = true;
	}

	setAuthAccountOnly(options: { authUserId: string; loginEmail: string | null }) {
		if (authPrincipalChanged(this.authUserId, options.authUserId)) {
			accessTokens.clear();
		}
		if (this.grants && this.userId) {
			this.authUserId = options.authUserId;
			this.loginEmail = options.loginEmail;
			this.ready = true;
			return;
		}

		this.authUserId = options.authUserId;
		this.loginEmail = options.loginEmail;
		this.needsOnboarding = false;
		this.userId = null;
		this.schoolId = null;
		this.sessionKind = null;
		this.subjectId = null;
		this.notificationEmail = null;
		this.notificationPhone = null;
		this.userProfile = null;
		this.guardianSettings = null;
		this.grants = null;
		this.staffMemberships = [];
		this.ready = true;
	}

	setServerOnboardingStatus(status: ServerOnboardingAccountStatus | null) {
		this.serverOnboardingStatus = status;
		if (status) {
			this.onboardingStatusUnknown = false;
		}
	}

	setOnboardingStatusUnknown(unknown: boolean) {
		this.onboardingStatusUnknown = unknown;
	}

	setFromServer(
		session: SessionSnapshot | null,
		options?: {
			staffProfile?: StaffMember | null;
			guardianSettings?: GuardianNotificationSettings | null;
			subjectId?: string | null;
			authUserId?: string | null;
			loginEmail?: string | null;
			notificationEmail?: string | null;
			notificationPhone?: string | null;
		},
	) {
		if (!session) {
			this.clear();
			return;
		}

		this.needsOnboarding = false;
		const nextAuthUserId = options?.authUserId ?? options?.subjectId ?? this.authUserId;
		if (authPrincipalChanged(this.authUserId, nextAuthUserId)) {
			accessTokens.clear();
		}
		this.authUserId = nextAuthUserId;
		this.userId = session.actorId;
		this.schoolId = session.schoolId;
		this.sessionKind = session.kind;
		this.grants = session.grants;
		this.userProfile = options?.staffProfile ?? null;
		this.guardianSettings = options?.guardianSettings ?? null;
		this.subjectId = options?.subjectId ?? null;
		this.loginEmail = options?.loginEmail ?? null;
		this.notificationEmail = options?.notificationEmail
			?? null;
		this.notificationPhone = options?.notificationPhone
			?? null;
		this.ready = true;
	}

	setStaffMemberships(memberships: StaffSchoolMembership[]) {
		this.staffMemberships = memberships;
	}

	selectStaffMembership(membership: StaffSchoolMembership) {
		this.needsOnboarding = false;
		this.sessionKind = 'staff';
		this.schoolId = membership.schoolId;
		this.userId = membership.actorId;
		this.grants = null;
	}

	updateNotificationContact(contact: {
		notificationEmail?: string | null;
		notificationPhone?: string | null;
	}) {
		if (contact.notificationEmail !== undefined) {
			this.notificationEmail = contact.notificationEmail;
		}
		if (contact.notificationPhone !== undefined) {
			this.notificationPhone = contact.notificationPhone;
		}
	}

	clear() {
		accessTokens.clear();
		this.userId = null;
		this.authUserId = null;
		this.needsOnboarding = false;
		this.serverOnboardingStatus = null;
		this.onboardingStatusUnknown = false;
		this.schoolId = null;
		this.sessionKind = null;
		this.subjectId = null;
		this.loginEmail = null;
		this.notificationEmail = null;
		this.notificationPhone = null;
		this.userProfile = null;
		this.guardianSettings = null;
		this.grants = null;
		this.staffMemberships = [];
	}

	async logout() {
		clearWizardCompletedInSession(this.authUserId);
		clearOnboardingSummaryHold(this.authUserId);
		this.clear();
		clearAuthGate();
		if (browser) {
			try {
				await authClient.signOut();
			}
			catch {
				// Ignore sign out errors on client
			}
		}
		this.ready = true;
	}
}

export const authSession = new AuthSession();
