import { dev } from '$app/environment';
import { PUBLIC_API_URL, PUBLIC_APP_ENV } from '$env/static/public';

export function isDemoLoginEnabled(): boolean {
	return dev; // || PUBLIC_APP_ENV === 'staging';
}

export function isLocalDevApi(): boolean {
	if (!dev || !PUBLIC_API_URL) {
		return false;
	}
	try {
		const host = new URL(PUBLIC_API_URL).hostname;
		return host === 'localhost' || host === '127.0.0.1';
	}
	catch {
		return false;
	}
}

/** Dev/staging helper — mark onboarding complete without finishing every wizard step. */
export function isOnboardingSkipEnabled(): boolean {
	return dev || PUBLIC_APP_ENV === 'staging';
}

/** Mirrors API `ALLOW_PUBLIC_SCHOOL_REGISTRATION` — enabled in dev/staging by default. */
export function isPublicSchoolRegistrationEnabled(): boolean {
	const flag = import.meta.env.PUBLIC_ALLOW_SCHOOL_REGISTRATION;
	if (flag === 'true') {
		return true;
	}
	if (flag === 'false') {
		return false;
	}
	return dev || PUBLIC_APP_ENV === 'staging';
}
