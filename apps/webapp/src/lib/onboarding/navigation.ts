import type { OnboardingStep } from '$lib/onboarding/types';
import { ONBOARDING_STEP_COUNT } from '$lib/onboarding/types';

const STEP_PARAM = 'step';

export function parseOnboardingStep(url: URL): OnboardingStep {
	const raw = url.searchParams.get(STEP_PARAM);
	const parsed = Number(raw);
	if (!Number.isInteger(parsed) || parsed < 1 || parsed > ONBOARDING_STEP_COUNT) {
		return 1;
	}
	return parsed as OnboardingStep;
}

export function writeOnboardingStepUrl(url: URL, step: OnboardingStep): string {
	const next = new URL(url);
	next.searchParams.set(STEP_PARAM, String(step));
	return `${next.pathname}${next.search}`;
}

export function onboardingStepUrl(step: OnboardingStep): string {
	return `/onboarding?${STEP_PARAM}=${step}`;
}

export function clampOnboardingStep(step: OnboardingStep, maxReachedStep: OnboardingStep): OnboardingStep {
	return step > maxReachedStep ? maxReachedStep : step;
}

export function canVisitOnboardingStep(step: OnboardingStep, maxReachedStep: OnboardingStep): boolean {
	return step >= 1 && step <= maxReachedStep;
}
