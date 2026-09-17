import { describe, expect, it } from 'bun:test';
import { createEmptyDraft } from '$lib/onboarding/draft-storage';
import {
	canVisitOnboardingStep,
	clampOnboardingStep,
	onboardingStepUrl,
	parseOnboardingStep,
	writeOnboardingStepUrl,
} from '$lib/onboarding/navigation';
import {
	canAdvanceFromStep,
	canFinishOnboarding,
	onboardingFinishCtaKey,
} from '$lib/onboarding/steps';

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
		draft.structure.levels = [{ gradeLevelId: 'ci-college:6EME', classCount: 1, capacity: 30, classNamingMode: 'numerical' }];
		expect(canAdvanceFromStep(2, draft)).toBe(true);
	});
});

describe('canFinishOnboarding', () => {
	it('requires submitted and still-valid school and structure', () => {
		const draft = createEmptyDraft();
		draft.school.name = 'Lycée EDAYA';
		draft.school.city = 'Abidjan';
		draft.schoolStepSubmitted = true;
		draft.structureStepSubmitted = true;
		expect(canFinishOnboarding(draft)).toBe(false);
		draft.structure.models = ['college'];
		draft.structure.levels = [{
			gradeLevelId: 'ci-college:6EME',
			classCount: 1,
			capacity: 30,
			classNamingMode: 'numerical',
		}];
		expect(canFinishOnboarding(draft)).toBe(true);
	});

	it('blocks finish when a staff invite email is invalid', () => {
		const draft = createEmptyDraft();
		draft.school.name = 'Lycée EDAYA';
		draft.school.city = 'Abidjan';
		draft.schoolStepSubmitted = true;
		draft.structureStepSubmitted = true;
		draft.structure.models = ['college'];
		draft.structure.levels = [{
			gradeLevelId: 'ci-college:6EME',
			classCount: 1,
			capacity: 30,
			classNamingMode: 'numerical',
		}];
		draft.staffInvites = [{ id: '1', email: 'not-an-email', role: 'secretary' }];
		expect(canFinishOnboarding(draft)).toBe(false);
		draft.staffInvites = [{ id: '1', email: 'secretary@school.fr', role: 'secretary' }];
		expect(canFinishOnboarding(draft)).toBe(true);
	});
});

describe('onboardingFinishCtaKey', () => {
	it('uses create-school until provision succeeds, then open dashboard', () => {
		expect(onboardingFinishCtaKey(false)).toBe('onboarding.createSchool');
		expect(onboardingFinishCtaKey(true)).toBe('onboarding.finish');
		expect(onboardingFinishCtaKey(true, true)).toBe('onboarding.retryBootstrap');
		expect(onboardingFinishCtaKey(false, true)).toBe('onboarding.retryBootstrap');
	});
});
