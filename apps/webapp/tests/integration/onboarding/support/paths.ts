import path from 'node:path';

export const ONBOARDING_RUN_OUT_DIR = path.join(
	import.meta.dirname,
	'../../../../.onboarding-run',
);

export const ONBOARDING_WEBAPP_BASE = process.env.WEBAPP_URL ?? 'http://localhost:5173';

export function webappReadinessPath(): string {
	return process.env.WEBAPP_READINESS_PATH ?? '/login';
}

export function stripTrailingSlash(base: string): string {
	return base.replace(/\/+$/, '');
}

export function onboardingPath(base: string, step?: number): string {
	const origin = stripTrailingSlash(base);
	if (step == null) {
		return `${origin}/onboarding`;
	}
	return `${origin}/onboarding?step=${step}`;
}

export function loginSignupPath(base: string): string {
	return `${stripTrailingSlash(base)}/login?panel=signup&method=password&stage=form`;
}

export function loginSignInPath(base: string): string {
	return `${stripTrailingSlash(base)}/login?panel=signin&method=password&stage=form`;
}

export function dashboardPath(base: string): string {
	return `${stripTrailingSlash(base)}/dashboard`;
}

export function invitePath(base: string, token: string): string {
	return `${stripTrailingSlash(base)}/invite/${encodeURIComponent(token)}`;
}

export function currentOnboardingStep(url: string): number | null {
	try {
		const parsed = new URL(url);
		if (parsed.pathname.replace(/\/+$/, '') !== '/onboarding') {
			return null;
		}
		const raw = parsed.searchParams.get('step');
		if (!raw) {
			return 1;
		}
		const step = Number(raw);
		return Number.isInteger(step) && step >= 1 ? step : null;
	}
	catch {
		return null;
	}
}
