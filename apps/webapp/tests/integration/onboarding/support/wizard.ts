import type { Page } from 'playwright';
import { selectComboboxOption } from '../../../../scripts/qa-harness-ui';
import { waitForEnabled } from './auth';
import { currentOnboardingStep } from './paths';

export const CONTINUE_BUTTON = /^(Continuer|Continue)$/;
export const SKIP_STEP_BUTTON = /passer cette étape|skip this step/i;
export const CREATE_SCHOOL_BUTTON = /créer votre école|create your school/i;
export const OPEN_DASHBOARD_BUTTON = /ouvrir le tableau de bord|open dashboard/i;
export const BACK_BUTTON = /^(Précédent|Back)$/;
export const COLLEGE_MODEL = /Collège|Middle school/;
export const STEPPER_NAV = /progression de la configuration|setup progress/i;

export function continueButton(page: Page) {
	return page.locator('footer').getByRole('button', { name: CONTINUE_BUTTON });
}

export function skipStepButton(page: Page) {
	return page.getByRole('button', { name: SKIP_STEP_BUTTON });
}

export function createSchoolButton(page: Page) {
	return page.locator('footer').getByRole('button', { name: CREATE_SCHOOL_BUTTON });
}

export function openDashboardButton(page: Page) {
	return page.locator('footer').getByRole('button', { name: 'Open dashboard', exact: true })
		.or(page.locator('footer').getByRole('button', { name: 'Ouvrir le tableau de bord', exact: true }));
}

export function backButton(page: Page) {
	return page.locator('footer').getByRole('button', { name: BACK_BUTTON });
}

export async function clickContinue(page: Page): Promise<void> {
	const before = currentOnboardingStep(page.url()) ?? 1;
	const button = continueButton(page);
	await waitForEnabled(button);
	await button.scrollIntoViewIfNeeded();
	await button.click();
	if (before >= 4) {
		return;
	}
	const deadline = Date.now() + 20_000;
	let advancedAt: number | null = null;
	while (Date.now() < deadline) {
		const step = currentOnboardingStep(page.url()) ?? 1;
		if (step > before) {
			if (advancedAt == null) {
				advancedAt = Date.now();
			}
			else if (Date.now() - advancedAt >= 300) {
				return;
			}
		}
		else if (advancedAt != null) {
			throw new Error(
				`Continue reached step ${step} then snapped back to ${page.url()}`,
			);
		}
		await page.waitForTimeout(150);
	}
	throw new Error(`Continue did not leave onboarding step ${before}: ${page.url()}`);
}

export async function expectContinueDisabled(page: Page): Promise<void> {
	const button = continueButton(page);
	await button.waitFor({ state: 'visible', timeout: 15_000 });
	if (!(await button.isDisabled())) {
		throw new Error(`Expected Continue to be disabled on ${page.url()}`);
	}
}

export async function addInvalidStaffInviteRow(page: Page): Promise<void> {
	const addRow = page.getByRole('button', { name: /add colleague|ajouter un collègue/i });
	await addRow.waitFor({ state: 'visible', timeout: 15_000 });
	await addRow.click();
	const email = page.locator('input[id^="staff-email-"]').first();
	await email.waitFor({ state: 'visible', timeout: 10_000 });
	await email.fill('not-an-email');
}

export async function addValidStaffInviteRow(page: Page, email: string): Promise<void> {
	const addRow = page.getByRole('button', { name: /add colleague|ajouter un collègue/i });
	await addRow.waitFor({ state: 'visible', timeout: 15_000 });
	await addRow.click();
	const emailInput = page.locator('input[id^="staff-email-"]').first();
	await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
	await emailInput.fill(email);
	await emailInput.blur();
	const row = page.locator('article').filter({ has: emailInput }).first();
	const roleTrigger = row.getByRole('combobox')
		.or(row.getByRole('button').filter({
			hasText: /secretary|secrétaire|choose a profile|choisir un profil/i,
		}));
	await roleTrigger.waitFor({ state: 'visible', timeout: 10_000 });
	await selectComboboxOption(page, roleTrigger, {
		value: 'secretary',
		name: /secretary|secrétaire/i,
	});
	await waitForEnabled(continueButton(page));
}

export async function fillSchoolIdentity(page: Page, name: string, city: string): Promise<void> {
	const nameInput = page.locator('#onboarding-school-name');
	const cityInput = page.locator('#onboarding-school-city');
	await nameInput.waitFor({ state: 'visible', timeout: 20_000 });
	await nameInput.fill(name);
	await nameInput.blur();
	await cityInput.fill(city);
	await cityInput.blur();
	await waitForEnabled(continueButton(page));
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

async function waitForOnboardingShell(page: Page): Promise<void> {
	await page.locator('[data-onboarding-step]').waitFor({ state: 'visible', timeout: 30_000 });
	await page.getByRole('navigation', { name: STEPPER_NAV }).waitFor({ state: 'visible', timeout: 20_000 });
}

export async function clickCreateSchoolAndWaitForProvision(page: Page): Promise<{ invitedCount: number }> {
	const createSchool = createSchoolButton(page);
	await waitForEnabled(createSchool);
	const provisionResponse = page.waitForResponse(
		response => response.request().method() === 'POST'
			&& response.url().includes('/core/onboarding/provision'),
		{ timeout: 120_000 },
	);
	await createSchool.click();
	const response = await provisionResponse;
	if (!response.ok()) {
		throw new Error(`Onboarding provision failed: ${response.status()} ${page.url()}`);
	}
	const body = await response.json().catch(() => null) as { staff?: { invitedCount?: number } } | null;
	await waitForProvisionHold(page);
	return { invitedCount: body?.staff?.invitedCount ?? 0 };
}

async function footerFinishLabel(page: Page): Promise<string> {
	const buttons = page.locator('footer').getByRole('button');
	const count = await buttons.count();
	if (count === 0) {
		return '';
	}
	return ((await buttons.nth(count - 1).textContent()) ?? '').replace(/\s+/g, ' ').trim();
}

function isOpenDashboardLabel(label: string): boolean {
	return /^(ouvrir le tableau de bord|open dashboard)$/i.test(label);
}

export async function waitForProvisionHold(page: Page): Promise<void> {
	const deadline = Date.now() + 120_000;
	let stableAt: number | null = null;
	while (Date.now() < deadline) {
		const finishLabel = await footerFinishLabel(page);
		const dashboardVisible = isOpenDashboardLabel(finishLabel);
		const backVisible = await backButton(page).isVisible().catch(() => false);
		const backLocked = !backVisible || (await backButton(page).isDisabled().catch(() => false));
		const step = currentOnboardingStep(page.url());
		if (dashboardVisible && backLocked && step === 4) {
			if (stableAt == null) {
				stableAt = Date.now();
			}
			else if (Date.now() - stableAt >= 500) {
				await waitForOnboardingShell(page);
				return;
			}
		}
		else {
			stableAt = null;
		}
		await page.waitForTimeout(150);
	}
	const footerButtons = await page.locator('footer button').allTextContents().catch(() => []);
	throw new Error(
		`Expected to stay on onboarding step 4 after provision, got ${page.url()} footer=${footerButtons.join(' | ')}`,
	);
}

export async function expectBackLocked(page: Page): Promise<void> {
	await waitForProvisionHold(page);
	const back = backButton(page);
	const visible = await back.isVisible().catch(() => false);
	if (visible && !(await back.isDisabled())) {
		const footerButtons = await page.locator('footer button').allTextContents().catch(() => []);
		throw new Error(
			`Back should be hidden or disabled after provision succeeds (${page.url()} footer=${footerButtons.join(' | ')})`,
		);
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
