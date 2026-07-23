import type { ServerOnboardingAccountStatus } from '$lib/onboarding/types';
import { browser } from '$app/environment';

const STORAGE_PREFIX = 'edaya:onboarding:wizardDone';

function storageKey(authUserId: string): string {
	return `${STORAGE_PREFIX}:${authUserId}`;
}

export function markWizardCompletedInSession(authUserId: string): void {
	if (!browser) {
		return;
	}
	sessionStorage.setItem(storageKey(authUserId), '1');
}

export function clearWizardCompletedInSession(authUserId: string | null | undefined): void {
	if (!browser || !authUserId) {
		return;
	}
	sessionStorage.removeItem(storageKey(authUserId));
}

export function isWizardCompletedInSession(authUserId: string | null | undefined): boolean {
	if (!browser || !authUserId) {
		return false;
	}
	return sessionStorage.getItem(storageKey(authUserId)) === '1';
}

export function mergeServerOnboardingStatus(
	current: ServerOnboardingAccountStatus | null,
	fetched: ServerOnboardingAccountStatus | null,
): ServerOnboardingAccountStatus | null {
	if (!fetched) {
		return current;
	}
	if (!current) {
		return fetched;
	}
	return {
		wizardCompleted: current.wizardCompleted || fetched.wizardCompleted,
		maxReachedStep: Math.max(current.maxReachedStep, fetched.maxReachedStep) as ServerOnboardingAccountStatus['maxReachedStep'],
		schoolStepSubmitted: current.schoolStepSubmitted || fetched.schoolStepSubmitted,
		structureStepSubmitted: current.structureStepSubmitted || fetched.structureStepSubmitted,
	};
}
