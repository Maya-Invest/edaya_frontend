import type { ResolvedPathname, RouteId } from '$app/types';
import { browser } from '$app/environment';
import { goto as kitGoto } from '$app/navigation';
import { resolve } from '$app/paths';

type AppGotoOptions = NonNullable<Parameters<typeof kitGoto>[1]>;

function onboardingStepFromUrl(url: URL): number | null {
	if (url.pathname.replace(/\/+$/, '') !== '/onboarding') {
		return null;
	}
	const raw = url.searchParams.get('step');
	if (!raw) {
		return 1;
	}
	const step = Number(raw);
	return Number.isInteger(step) && step >= 1 ? step : 1;
}

/** True when `nextHref` would send an in-progress wizard back to an earlier step. */
export function isOnboardingStepRegression(currentHref: string, nextHref: string): boolean {
	try {
		const currentUrl = new URL(currentHref);
		const nextUrl = new URL(nextHref, currentHref);
		const currentStep = onboardingStepFromUrl(currentUrl);
		const nextStep = onboardingStepFromUrl(nextUrl);
		return currentStep != null && nextStep != null && nextStep < currentStep;
	}
	catch {
		return false;
	}
}

let wizardNavUntil = 0;

/** Allow Back / stepper (and our own replaceState) to move to an earlier step. */
export function markWizardOnboardingNavigation(): void {
	wizardNavUntil = Date.now() + 1_000;
}

export function isWizardOnboardingNavigation(): boolean {
	return Date.now() < wizardNavUntil;
}

/**
 * Cancel a queued post-auth `/onboarding?step=1` (or missing step) after the wizard
 * has already advanced. `from` can still be `/login` while `window.location` is step 2.
 */
export function shouldBlockStaleOnboardingNavigation(options: {
	to: URL | null | undefined;
	currentHref: string;
	wizardInitiated: boolean;
}): boolean {
	if (options.wizardInitiated || !options.to) {
		return false;
	}

	const toStep = onboardingStepFromUrl(options.to);
	if (toStep == null) {
		return false;
	}

	try {
		const currentStep = onboardingStepFromUrl(new URL(options.currentHref));
		return currentStep != null && toStep < currentStep;
	}
	catch {
		return false;
	}
}

function isSameAppHref(currentHref: string, nextHref: string): boolean {
	try {
		const current = new URL(currentHref);
		const next = new URL(nextHref, currentHref);
		return current.pathname === next.pathname
			&& current.search === next.search
			&& current.hash === next.hash;
	}
	catch {
		return false;
	}
}

export function appGoto(href: ResolvedPathname | string, opts?: AppGotoOptions) {
	if (browser) {
		const nextHref = String(href);
		if (isSameAppHref(window.location.href, nextHref)) {
			return Promise.resolve();
		}
		if (
			!isWizardOnboardingNavigation()
			&& isOnboardingStepRegression(window.location.href, nextHref)
		) {
			return Promise.resolve();
		}
	}
	// href is already resolved via appPath(); kitGoto receives a ResolvedPathname.
	// eslint-disable-next-line svelte/no-navigation-without-resolve -- central navigation wrapper
	return kitGoto(href as ResolvedPathname, opts);
}

const resolvePath = resolve as (
	route: RouteId,
	params?: Record<string, string | undefined>,
) => ResolvedPathname;

export function appPath(route: RouteId): ResolvedPathname;
export function appPath(
	route: RouteId,
	params: Record<string, string | undefined>,
): ResolvedPathname;
export function appPath(
	route: RouteId,
	params?: Record<string, string | undefined>,
): ResolvedPathname {
	// Routes with optional [[param]] segments still require a params object at runtime.
	return resolvePath(route, params ?? {});
}

const CLASS_SEGMENTS: Record<string, RouteId> = {
	'students': '/(app)/classes/[classId]/students/[[id]]',
	'timetable': '/(app)/classes/[classId]/timetable',
	'teaching': '/(app)/classes/[classId]/teaching/[[id]]',
	'evaluations': '/(app)/classes/[classId]/evaluations/[[id]]',
	'attendance': '/(app)/classes/[classId]/attendance/[[id]]',
	'report-cards': '/(app)/classes/[classId]/report-cards/[[id]]',
};

export function classItemHref(classId: string, segment: string): ResolvedPathname {
	if (!classId) {
		return appPath('/(app)/dashboard');
	}
	const route = CLASS_SEGMENTS[segment] ?? '/(app)/classes/[classId]/students/[[id]]';
	return appPath(route, { classId });
}
