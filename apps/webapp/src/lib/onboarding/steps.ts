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

export function canFinishOnboarding(draft: OnboardingDraft): boolean {
	return draft.schoolStepSubmitted && draft.structureStepSubmitted;
}

export function canAdvanceFromStep(
	step: OnboardingStep,
	draft: OnboardingDraft,
	loginEmail?: string | null,
): boolean {
	switch (step) {
		case 1: {
			if (!isSchoolStepValid(draft.school)) {
				return false;
			}
			if (!draft.consortiumId) {
				return true;
			}
			if (draft.ownerAssignment === 'invite') {
				return /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(draft.ownerInviteEmail.trim());
			}
			return draft.ownerAssignment === 'self' || draft.ownerAssignment === 'later';
		}
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
