import { describe, expect, it } from 'bun:test';
import { createEmptyDraft } from './draft-storage';
import {
	canVisitOnboardingStep,
	clampOnboardingStep,
	onboardingStepUrl,
	parseOnboardingStep,
	writeOnboardingStepUrl,
} from './navigation';
import { canAdvanceFromStep } from './steps';

describe('onboarding navigation', () => {
	it('parses and writes step query params', () => {
		const url = new URL('http://localhost/onboarding?step=2');
		expect(parseOnboardingStep(url)).toBe(2);
		expect(writeOnboardingStepUrl(url, 3)).toBe('/onboarding?step=3');
		expect(onboardingStepUrl(4)).toBe('/onboarding?step=4');
	});

	it('falls back to step 1 for invalid values', () => {
		expect(parseOnboardingStep(new URL('http://localhost/onboarding'))).toBe(1);
		expect(parseOnboardingStep(new URL('http://localhost/onboarding?step=9'))).toBe(1);
	});

	it('clamps forward navigation to max reached step', () => {
		expect(clampOnboardingStep(4, 2)).toBe(2);
		expect(canVisitOnboardingStep(3, 2)).toBe(false);
		expect(canVisitOnboardingStep(2, 2)).toBe(true);
	});
});

describe('canAdvanceFromStep', () => {
	it('requires a complete school form on step 1', () => {
		const draft = createEmptyDraft();
		expect(canAdvanceFromStep(1, draft)).toBe(false);
		draft.school.name = 'Lycée EDAYA';
		expect(canAdvanceFromStep(1, draft)).toBe(false);
		draft.school.city = 'Paris';
		expect(canAdvanceFromStep(1, draft)).toBe(true);
	});

	it('allows optional middle steps and blocks step 4 continue', () => {
		const draft = createEmptyDraft();
		expect(canAdvanceFromStep(3, draft)).toBe(true);
		expect(canAdvanceFromStep(4, draft)).toBe(false);
	});

	it('requires structure configuration on step 2', () => {
		const draft = createEmptyDraft();
		expect(canAdvanceFromStep(2, draft)).toBe(false);
		draft.structure.models = ['college'];
		draft.structure.levels = [{ gradeLevelId: 'gl-6', classCount: 1, capacity: 30 }];
		expect(canAdvanceFromStep(2, draft)).toBe(true);
	});
});
