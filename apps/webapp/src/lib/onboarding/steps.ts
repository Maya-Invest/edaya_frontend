import type { OnboardingDraft, OnboardingStep } from '$lib/onboarding/types';
import { isSchoolStepValid } from '$lib/onboarding/school-step-validation';
import { isStaffStepValid } from '$lib/onboarding/staff-step-validation';
import { isStructureStepValid } from '$lib/onboarding/structure-step-validation';

export interface OnboardingStepDefinition {
	id: OnboardingStep;
	labelKey:
		| 'onboarding.step.school'
		| 'onboarding.step.structure'
		| 'onboarding.step.staff'
		| 'onboarding.step.complete';
	descriptionKey:
		| 'onboarding.stepDescription.school'
		| 'onboarding.stepDescription.structure'
		| 'onboarding.stepDescription.staff'
		| 'onboarding.stepDescription.complete';
	optional?: boolean;
}

export const ONBOARDING_STEPS: readonly OnboardingStepDefinition[] = [
	{
		id: 1,
		labelKey: 'onboarding.step.school',
		descriptionKey: 'onboarding.stepDescription.school',
	},
	{
		id: 2,
		labelKey: 'onboarding.step.structure',
		descriptionKey: 'onboarding.stepDescription.structure',
	},
	{
		id: 3,
		labelKey: 'onboarding.step.staff',
		descriptionKey: 'onboarding.stepDescription.staff',
		optional: true,
	},
	{
		id: 4,
		labelKey: 'onboarding.step.complete',
		descriptionKey: 'onboarding.stepDescription.complete',
	},
] as const;

export function getOnboardingStepDefinition(step: OnboardingStep): OnboardingStepDefinition {
	return ONBOARDING_STEPS[step - 1]!;
}

export type FinishOnboardingBlockKey
	= | 'onboarding.completeStep.incomplete'
		| 'onboarding.staffStep.invalidInvite';

/** Why Finish is blocked. Null means the draft can be provisioned. */
export function finishOnboardingBlockKey(
	draft: OnboardingDraft,
	loginEmail?: string | null,
): FinishOnboardingBlockKey | null {
	if (
		!draft.schoolStepSubmitted
		|| !draft.structureStepSubmitted
		|| !isSchoolStepValid(draft.school)
		|| !isStructureStepValid(draft.structure)
	) {
		return 'onboarding.completeStep.incomplete';
	}
	if (!isStaffStepValid(draft.staffInvites, loginEmail)) {
		return 'onboarding.staffStep.invalidInvite';
	}
	return null;
}

export function canFinishOnboarding(
	draft: OnboardingDraft,
	loginEmail?: string | null,
): boolean {
	return finishOnboardingBlockKey(draft, loginEmail) === null;
}

export type OnboardingFinishCtaKey = 'onboarding.createSchool' | 'onboarding.finish';

export function onboardingFinishCtaKey(provisionSucceeded: boolean): OnboardingFinishCtaKey {
	return provisionSucceeded ? 'onboarding.finish' : 'onboarding.createSchool';
}

export function canAdvanceFromStep(
	step: OnboardingStep,
	draft: OnboardingDraft,
	loginEmail?: string | null,
): boolean {
	switch (step) {
		case 1:
			return isSchoolStepValid(draft.school);
		case 2:
			return isStructureStepValid(draft.structure);
		case 3:
			return isStaffStepValid(draft.staffInvites, loginEmail);
		case 4:
			return false;
		default:
			return false;
	}
}

export function nextOnboardingStep(step: OnboardingStep): OnboardingStep | null {
	if (step >= 4) {
		return null;
	}
	return (step + 1) as OnboardingStep;
}

export function previousOnboardingStep(step: OnboardingStep): OnboardingStep | null {
	if (step <= 1) {
		return null;
	}
	return (step - 1) as OnboardingStep;
}
