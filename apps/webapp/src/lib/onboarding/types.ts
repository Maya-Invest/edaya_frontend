export const ONBOARDING_DRAFT_VERSION = 5 as const;
export const ONBOARDING_STEP_COUNT = 4;

export type OnboardingStep = 1 | 2 | 3 | 4;

export type OnboardingPathChoice = 'single' | 'consortium';

export type OnboardingOwnerAssignment = 'self' | 'invite' | 'later';

export interface OnboardingPeriodDraft {
	id: string;
	label: string;
	start: string;
	end: string;
}

export interface OnboardingSchoolDraft {
	name: string;
	city: string;
	country: string;
	timezone: string;
	academicYearLabel: string;
	academicYearStart: string;
	academicYearEnd: string;
	periodType: 'trimester' | 'semester';
	periods: OnboardingPeriodDraft[];
}

export interface OnboardingStructureLevelDraft {
	gradeLevelId: string;
	classCount: number;
	capacity: number;
}

export interface OnboardingStructureDraft {
	models: Array<'college' | 'lycee'>;
	levels: OnboardingStructureLevelDraft[];
}

export type OnboardingStaffInviteRole
	= | 'deputy_director'
		| 'cpe'
		| 'secretary'
		| 'studies_director'
		| 'it_admin'
		| 'accountant';

export interface OnboardingStaffInviteDraft {
	id: string;
	email: string;
	role: OnboardingStaffInviteRole | '';
}

export interface OnboardingDraft {
	version: typeof ONBOARDING_DRAFT_VERSION;
	updatedAt: string;
	maxReachedStep: OnboardingStep;
	wizardCompleted: boolean;
	pathChoice: OnboardingPathChoice | null;
	pathChoiceSubmitted: boolean;
	consortiumId: string | null;
	consortiumName: string;
	ownerAssignment: OnboardingOwnerAssignment;
	ownerInviteEmail: string;
	/** Draft completeness: school form validated and Continue pressed (not necessarily provisioned). */
	schoolStepSubmitted: boolean;
	/** Draft completeness: structure form validated and Continue pressed (not necessarily provisioned). */
	structureStepSubmitted: boolean;
	/** Draft completeness: staff step Continue pressed (invites may still be empty). */
	staffStepSubmitted: boolean;
	registeredSchoolId: string | null;
	school: OnboardingSchoolDraft;
	structure: OnboardingStructureDraft;
	staffInvites: OnboardingStaffInviteDraft[];
}

/** Server-derived progress from real DB state (years / grade levels / completion flag). */
export interface ServerOnboardingAccountStatus {
	wizardCompleted: boolean;
	maxReachedStep: OnboardingStep;
	schoolStepSubmitted: boolean;
	structureStepSubmitted: boolean;
}
