import { onboardingStepUrl } from '$lib/onboarding/navigation';
import { redirect } from '@sveltejs/kit';

export function load({ url }) {
	if (!url.searchParams.has('step')) {
		redirect(302, onboardingStepUrl(1));
	}
}
