import { describe, expect, it } from 'bun:test';
import { dictionaries } from '$lib/i18n/dictionaries';
import { onboardingUserErrorMessage } from '$lib/onboarding/onboarding-user-error';
import { ApiError } from '@maya-invest/edaya-api-client';

describe('onboardingUserErrorMessage', () => {
	it('maps known API codes to user-facing copy', () => {
		const error = new ApiError(409, { code: 'STRUCTURE_ALREADY_CONFIGURED' });
		expect(onboardingUserErrorMessage(error, 'onboarding.completeStep.failed')).toBe(
			dictionaries.fr['onboarding.structureStep.alreadyConfigured'],
		);
	});

	it('does not show raw API messages to the user', () => {
		const error = new ApiError(500, { message: 'ECONNRESET on provision.school' });
		expect(onboardingUserErrorMessage(error, 'onboarding.completeStep.failed')).toBe(
			dictionaries.fr['onboarding.completeStep.failed'],
		);
	});

	it('maps provision 422 invite issues to staff copy', () => {
		const error = new ApiError(422, {
			success: false,
			error: {
				name: 'ZodError',
				issues: [{ path: ['invites', 0, 'email'], message: 'Invalid email' }],
			},
		});
		expect(onboardingUserErrorMessage(error, 'onboarding.completeStep.failed')).toBe(
			dictionaries.fr['onboarding.staffStep.invalidInvite'],
		);
	});

	it('maps provision 422 school or structure issues to incomplete copy', () => {
		const error = new ApiError(422, {
			success: false,
			error: {
				name: 'ZodError',
				issues: [{ path: ['structure', 'levels'], message: 'Required' }],
			},
		});
		expect(onboardingUserErrorMessage(error, 'onboarding.completeStep.failed')).toBe(
			dictionaries.fr['onboarding.completeStep.incomplete'],
		);
	});
});
