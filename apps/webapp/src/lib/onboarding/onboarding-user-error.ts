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
	}
	return get(t)(fallbackKey);
}
