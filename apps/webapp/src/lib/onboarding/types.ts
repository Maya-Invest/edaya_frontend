export const ONBOARDING_DRAFT_VERSION = 3 as const;
export const ONBOARDING_STEP_COUNT = 4;

export type OnboardingStep = 1 | 2 | 3 | 4;

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
		| 'teacher'
		| 'secretary';

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
	schoolStepSubmitted: boolean;
	structureStepSubmitted: boolean;
	staffStepSubmitted: boolean;
	registeredSchoolId: string | null;
	school: OnboardingSchoolDraft;
	structure: OnboardingStructureDraft;
	staffInvites: OnboardingStaffInviteDraft[];
}

export interface ServerOnboardingAccountStatus {
	wizardCompleted: boolean;
	maxReachedStep: OnboardingStep;
	schoolStepSubmitted: boolean;
	structureStepSubmitted: boolean;
}
