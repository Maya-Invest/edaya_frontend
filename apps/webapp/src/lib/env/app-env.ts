import { dev } from '$app/environment';
import * as publicEnv from '$env/static/public';

const { PUBLIC_API_URL, PUBLIC_APP_ENV } = publicEnv;

// Optional public flags must come through SvelteKit's environment module.
// Vite's import.meta.env only exposes its own configured prefixes.
const optionalPublicEnv: Record<string, string> = { ...publicEnv };

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

export const DEFAULT_PROFILE_PHOTO_MAX_BYTES = 1_048_576;

/** Mirrors API `PROFILE_PHOTO_MAX_BYTES` for client JPEG export. */
export function profilePhotoMaxBytes(): number {
	const parsed = Number(optionalPublicEnv.PUBLIC_PROFILE_PHOTO_MAX_BYTES);
	if (Number.isFinite(parsed) && parsed > 0) {
		return Math.floor(parsed);
	}
	return DEFAULT_PROFILE_PHOTO_MAX_BYTES;
}

/** Mirrors API `ALLOW_PUBLIC_SCHOOL_REGISTRATION` — enabled in dev/staging by default. */
export function isPublicSchoolRegistrationEnabled(): boolean {
	const flag = optionalPublicEnv.PUBLIC_ALLOW_SCHOOL_REGISTRATION;
	if (flag === 'true') {
		return true;
	}
	if (flag === 'false') {
		return false;
	}
	return dev || PUBLIC_APP_ENV === 'staging';
}
