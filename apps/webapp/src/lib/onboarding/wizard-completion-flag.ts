import type { ServerOnboardingAccountStatus } from '$lib/onboarding/types';
import { browser } from '$app/environment';

const STORAGE_PREFIX = 'edaya:onboarding:wizardDone';
const SUMMARY_HOLD_PREFIX = 'edaya:onboarding:holdSummary';

function storageKey(authUserId: string): string {
	return `${STORAGE_PREFIX}:${authUserId}`;
}

function summaryHoldKey(authUserId: string): string {
	return `${SUMMARY_HOLD_PREFIX}:${authUserId}`;
}

function canUseSessionStorage(): boolean {
	return typeof sessionStorage !== 'undefined';
}

/** Stay on the step-4 summary until the user opens the dashboard. Survives reload. */
export function markOnboardingSummaryHold(authUserId: string): void {
	if (!canUseSessionStorage()) {
		return;
	}
	sessionStorage.setItem(summaryHoldKey(authUserId), '1');
}

export function clearOnboardingSummaryHold(authUserId: string | null | undefined): void {
	if (!canUseSessionStorage() || !authUserId) {
		return;
	}
	sessionStorage.removeItem(summaryHoldKey(authUserId));
}

export function isOnboardingSummaryHold(authUserId: string | null | undefined): boolean {
	if (!canUseSessionStorage() || !authUserId) {
		return false;
	}
	return sessionStorage.getItem(summaryHoldKey(authUserId)) === '1';
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
