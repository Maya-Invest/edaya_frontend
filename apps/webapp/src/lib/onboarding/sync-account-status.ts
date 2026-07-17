import type { ServerOnboardingAccountStatus } from '$lib/onboarding/types';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { ApiError } from '@maya-invest/edaya-api-client';

export async function fetchServerOnboardingAccountStatus(): Promise<ServerOnboardingAccountStatus | null> {
	try {
		return await getBrowserSchoolClient().onboarding.accountStatus();
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
			return null;
		}
		throw error;
	}
}
