import type { Page } from 'playwright';
import { expectOnboardingStep } from '../support/auth';
import { dashboardPath, onboardingPath, stripTrailingSlash } from '../support/paths';

export async function assertUnauthenticatedOnboardingRedirect(
	page: Page,
	base: string,
): Promise<void> {
	await page.goto(onboardingPath(base), { waitUntil: 'domcontentloaded' });
	await page.waitForURL(/\/login/, { timeout: 20_000 });
}

export async function assertPublicAuthGates(page: Page, base: string): Promise<void> {
	const origin = stripTrailingSlash(base);
	for (const path of ['/', '/dashboard', '/onboarding']) {
		await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' });
		await page.waitForURL(/\/login/, { timeout: 20_000 });
	}
}

export async function assertIncompleteWizardBouncesToStep(
	page: Page,
	base: string,
	step: number,
): Promise<void> {
	await page.goto(dashboardPath(base), { waitUntil: 'domcontentloaded' });
	await page.waitForURL(/\/onboarding/, { timeout: 20_000 });
	await expectOnboardingStep(page, step);
}

export async function assertStepClamped(
	page: Page,
	base: string,
	requestedStep: number,
	allowedStep: number,
): Promise<void> {
	await page.goto(onboardingPath(base, requestedStep), { waitUntil: 'domcontentloaded' });
	await expectOnboardingStep(page, allowedStep);
}
