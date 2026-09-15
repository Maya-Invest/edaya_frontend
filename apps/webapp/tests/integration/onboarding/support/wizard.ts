import type { Page } from 'playwright';
import { waitForEnabled } from '../../demo-dry-run/support/auth';
import { currentOnboardingStep } from './paths';

export const CONTINUE_BUTTON = /^(Continuer|Continue)$/;
export const SKIP_STEP_BUTTON = /passer cette étape|skip this step/i;
export const CREATE_SCHOOL_BUTTON = /créer votre école|create your school/i;
export const OPEN_DASHBOARD_BUTTON = /ouvrir le tableau de bord|open dashboard/i;
export const BACK_BUTTON = /^(Précédent|Back)$/;
export const COLLEGE_MODEL = /Collège|Middle school/;
export const STEPPER_NAV = /progression de la configuration|setup progress/i;

export function continueButton(page: Page) {
	return page.getByRole('button', { name: CONTINUE_BUTTON });
}

export function skipStepButton(page: Page) {
	return page.getByRole('button', { name: SKIP_STEP_BUTTON });
}

export function createSchoolButton(page: Page) {
	return page.getByRole('button', { name: CREATE_SCHOOL_BUTTON });
}

export function openDashboardButton(page: Page) {
	return page.getByRole('button', { name: OPEN_DASHBOARD_BUTTON });
}

export function backButton(page: Page) {
	return page.getByRole('button', { name: BACK_BUTTON });
}

export async function clickContinue(page: Page): Promise<void> {
	const button = continueButton(page);
	await waitForEnabled(button);
	await button.click();
}

export async function fillSchoolIdentity(page: Page, name: string, city: string): Promise<void> {
	const nameInput = page.locator('#onboarding-school-name');
	await nameInput.waitFor({ state: 'visible', timeout: 20_000 });
	await nameInput.fill(name);
	await page.locator('#onboarding-school-city').fill(city);
}

export async function selectCollegeAndOneClass(page: Page): Promise<void> {
	await page.getByText(/chargement des niveaux|loading grade levels/i).waitFor({
		state: 'hidden',
		timeout: 30_000,
	}).catch(() => undefined);

	const collegeLabel = page.locator('label').filter({ hasText: COLLEGE_MODEL });
	await collegeLabel.waitFor({ state: 'visible', timeout: 30_000 });
	const checkbox = collegeLabel.getByRole('checkbox');
	await waitForEnabled(checkbox, 30_000);
	if (!(await checkbox.isChecked().catch(() => false))) {
		await collegeLabel.click();
	}

	const firstRow = page.locator('.divide-y > div').first();
	await firstRow.waitFor({ state: 'visible', timeout: 15_000 });
	const plus = firstRow.getByRole('button').nth(1);
	await waitForEnabled(plus);
	await plus.click();
}

export async function waitForProvisionHold(page: Page): Promise<void> {
	await page.getByRole('progressbar').waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined);
	await openDashboardButton(page).waitFor({ state: 'visible', timeout: 120_000 });
	const step = currentOnboardingStep(page.url());
	if (step !== 4) {
		throw new Error(`Expected to stay on onboarding step 4 after provision, got ${page.url()}`);
	}
}

export async function expectBackLocked(page: Page): Promise<void> {
	const back = backButton(page);
	const visible = await back.isVisible().catch(() => false);
	if (visible && !(await back.isDisabled())) {
		throw new Error('Back should be hidden or disabled after provision succeeds');
	}

	const stepperButtons = page.getByRole('navigation', { name: STEPPER_NAV }).getByRole('button');
	const count = await stepperButtons.count();
	if (count === 0) {
		throw new Error('Onboarding stepper not found after provision');
	}
	for (let index = 0; index < count; index += 1) {
		const button = stepperButtons.nth(index);
		if (!(await button.isDisabled())) {
			throw new Error(`Stepper button ${index} should be locked after provision succeeds`);
		}
	}
}
