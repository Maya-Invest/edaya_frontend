import { describe, expect, it } from 'bun:test';
import { isOnboardingStepRegression, shouldBlockStaleOnboardingNavigation } from '$lib/navigation/app-navigation';
import { CONFIG_ITEMS, FINANCE_ITEMS, SCHOOL_ITEMS } from '$lib/navigation';

describe('navigation route map', () => {
	it('resolves every school, finance, and configuration entry', () => {
		expect(SCHOOL_ITEMS.find(item => item.key === 'marksReview')?.href).toBe('/school/corrections');
		expect(SCHOOL_ITEMS.every(item => item.href.startsWith('/'))).toBe(true);
		expect(FINANCE_ITEMS.every(item => item.href.startsWith('/'))).toBe(true);
		expect(CONFIG_ITEMS.every(item => item.href.startsWith('/'))).toBe(true);
	});
});

describe('isOnboardingStepRegression', () => {
	it('blocks a stale onboarding entry from wiping a later wizard step', () => {
		expect(isOnboardingStepRegression(
			'http://localhost:5173/onboarding?step=2',
			'/onboarding',
		)).toBe(true);
		expect(isOnboardingStepRegression(
			'http://localhost:5173/onboarding?step=2',
			'/onboarding?step=1',
		)).toBe(true);
	});

	it('allows forward wizard navigation and non-onboarding routes', () => {
		expect(isOnboardingStepRegression(
			'http://localhost:5173/onboarding?step=1',
			'/onboarding?step=2',
		)).toBe(false);
		expect(isOnboardingStepRegression(
			'http://localhost:5173/login',
			'/onboarding',
		)).toBe(false);
		expect(isOnboardingStepRegression(
			'http://localhost:5173/onboarding?step=2',
			'/dashboard',
		)).toBe(false);
	});
});

describe('shouldBlockStaleOnboardingNavigation', () => {
	it('blocks a delayed post-auth step-1 goto after the wizard is on step 2', () => {
		expect(shouldBlockStaleOnboardingNavigation({
			to: new URL('http://localhost:5173/onboarding?step=1'),
			currentHref: 'http://localhost:5173/onboarding?step=2',
			wizardInitiated: false,
		})).toBe(true);
		expect(shouldBlockStaleOnboardingNavigation({
			to: new URL('http://localhost:5173/onboarding'),
			currentHref: 'http://localhost:5173/onboarding?step=2',
			wizardInitiated: false,
		})).toBe(true);
	});

	it('allows wizard-owned back navigation and the initial landing from login', () => {
		expect(shouldBlockStaleOnboardingNavigation({
			to: new URL('http://localhost:5173/onboarding?step=1'),
			currentHref: 'http://localhost:5173/onboarding?step=2',
			wizardInitiated: true,
		})).toBe(false);
		expect(shouldBlockStaleOnboardingNavigation({
			to: new URL('http://localhost:5173/onboarding?step=1'),
			currentHref: 'http://localhost:5173/login?panel=signup',
			wizardInitiated: false,
		})).toBe(false);
		expect(shouldBlockStaleOnboardingNavigation({
			to: new URL('http://localhost:5173/dashboard'),
			currentHref: 'http://localhost:5173/onboarding?step=2',
			wizardInitiated: false,
		})).toBe(false);
	});
});
