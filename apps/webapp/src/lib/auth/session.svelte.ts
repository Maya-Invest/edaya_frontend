import type { GuardianNotificationSettings } from '$lib/api/account-data';
import type { AccountActor, SessionKind } from '$lib/auth/account-actor';
import type { EffectiveGrantsSnapshot, SessionSnapshot } from '$lib/auth/types';
import type { ServerOnboardingAccountStatus } from '$lib/onboarding/types';
import type { StaffMember } from '$lib/types/school';
import { browser } from '$app/environment';
import { academicContext } from '$lib/academic/context.svelte';
import { clearAuthGate } from '$lib/auth/auth-gate';
import { clearWizardCompletedInSession } from '$lib/onboarding/wizard-completion-flag';
import { authClient } from './client';

class AuthSession {
	userId = $state<string | null>(null);
	authUserId = $state<string | null>(null);
	needsOnboarding = $state(false);
	serverOnboardingStatus = $state<ServerOnboardingAccountStatus | null>(null);
	schoolId = $state<string | null>(null);
	sessionKind = $state<SessionKind | null>(null);
	subjectId = $state<string | null>(null);
	loginEmail = $state<string | null>(null);
	notificationEmail = $state<string | null>(null);
	notificationPhone = $state<string | null>(null);
	userProfile = $state<StaffMember | null>(null);
	guardianSettings = $state<GuardianNotificationSettings | null>(null);
	grants = $state<EffectiveGrantsSnapshot | null>(null);
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
				subtitleKey: this.grants?.isElevated
					? 'staff.role.owner'
					: this.userProfile
						? `staff.role.${this.userProfile.role}`
						: 'staff.role.professeur',
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

	markLoading() {
		this.ready = false;
	}

	markReady() {
		this.ready = true;
	}

	setPendingOnboarding(options: { authUserId: string; loginEmail: string | null }) {
		this.authUserId = options.authUserId;
		this.needsOnboarding = true;
		this.serverOnboardingStatus = null;
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
		this.ready = true;
	}

	setAuthAccountOnly(options: { authUserId: string; loginEmail: string | null }) {
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
		this.ready = true;
	}

	setServerOnboardingStatus(status: ServerOnboardingAccountStatus | null) {
		this.serverOnboardingStatus = status;
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
		this.authUserId = options?.authUserId ?? options?.subjectId ?? this.authUserId;
		this.userId = session.actorId;
		this.schoolId = session.schoolId;
		this.sessionKind = session.kind;
		this.grants = session.effectiveGrants;
		this.userProfile = options?.staffProfile ?? null;
		this.guardianSettings = options?.guardianSettings ?? null;
		this.subjectId = options?.subjectId ?? null;
		this.loginEmail = options?.loginEmail ?? null;
		this.notificationEmail = options?.notificationEmail
			?? options?.guardianSettings?.notificationEmail
			?? null;
		this.notificationPhone = options?.notificationPhone
			?? options?.guardianSettings?.notificationPhone
			?? null;
		this.ready = true;
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
		if (this.guardianSettings) {
			this.guardianSettings = {
				...this.guardianSettings,
				notificationEmail: this.notificationEmail,
				notificationPhone: this.notificationPhone,
			};
		}
	}

	clear() {
		this.userId = null;
		this.authUserId = null;
		this.needsOnboarding = false;
		this.serverOnboardingStatus = null;
		this.schoolId = null;
		this.sessionKind = null;
		this.subjectId = null;
		this.loginEmail = null;
		this.notificationEmail = null;
		this.notificationPhone = null;
		this.userProfile = null;
		this.guardianSettings = null;
		this.grants = null;
	}

	async logout() {
		clearWizardCompletedInSession(this.authUserId);
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
