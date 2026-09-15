import { t } from '$lib/i18n';
import { ApiError } from '@maya-invest/edaya-api-client';
import { get } from 'svelte/store';

const ONBOARDING_ERROR_CODE_KEYS = {
	ACADEMIC_PERIOD_OUTSIDE_YEAR: 'onboarding.schoolStep.periodOutsideYear',
	SUBJECT_ALREADY_LINKED: 'onboarding.schoolStep.alreadyLinked',
	STRUCTURE_ALREADY_CONFIGURED: 'onboarding.structureStep.alreadyConfigured',
	STAFF_INVITE_OWNER_EMAIL: 'onboarding.staffStep.ownerEmail',
	INVITE_BASE_URL_MISSING: 'onboarding.staffStep.inviteUrlMissing',
} as const;

function issuePath(issue: unknown): string {
	if (!issue || typeof issue !== 'object') {
		return '';
	}
	const path = (issue as { path?: unknown }).path;
	if (!Array.isArray(path)) {
		return '';
	}
	return path.map(String).join('.');
}

function zodIssuesFromBody(body: Record<string, unknown>): unknown[] {
	const nested = body.error;
	if (nested && typeof nested === 'object' && Array.isArray((nested as { issues?: unknown }).issues)) {
		return (nested as { issues: unknown[] }).issues;
	}
	return Array.isArray(body.issues) ? body.issues : [];
}

function messageForZodIssues(issues: unknown[]): string | null {
	if (issues.length === 0) {
		return null;
	}
	const paths = issues.map(issuePath);
	if (paths.some(path => path.startsWith('invites'))) {
		return get(t)('onboarding.staffStep.invalidInvite');
	}
	if (paths.some(path => path.startsWith('structure'))) {
		return get(t)('onboarding.completeStep.incomplete');
	}
	if (paths.some(path => path.startsWith('school'))) {
		return get(t)('onboarding.completeStep.incomplete');
	}
	return get(t)('onboarding.completeStep.incomplete');
}

/** Maps API failures to copy a school user can act on. Never surfaces raw server text. */
export function onboardingUserErrorMessage(error: unknown, fallbackKey: string): string {
	if (error instanceof ApiError && error.body && typeof error.body === 'object') {
		const body = error.body as Record<string, unknown>;
		if (typeof body.code === 'string') {
			const key = ONBOARDING_ERROR_CODE_KEYS[body.code as keyof typeof ONBOARDING_ERROR_CODE_KEYS];
			if (key) {
				return get(t)(key);
			}
		}
		if (error.status === 422) {
			const mapped = messageForZodIssues(zodIssuesFromBody(body));
			if (mapped) {
				return mapped;
			}
		}
	}
	return get(t)(fallbackKey);
}
