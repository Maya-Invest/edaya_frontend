import { selectControl } from '../../support/custom-select';
import type { Page } from 'playwright';
import { selectComboboxOption } from '../../../../scripts/qa-harness-ui';
import { expectOnboardingStep, signUpThroughUi, waitForEnabled } from '../support/auth';
import { fillSchoolIdentity } from '../support/wizard';
import type { OnboardingRunContext } from '../types';

function periodDateInputs(page: Page) {
	return page.locator('input[id^="onboarding-period-start-"], input[id^="onboarding-period-end-"]');
}

async function expectPeriodDateCount(page: Page, expected: number): Promise<void> {
	const deadline = Date.now() + 10_000;
	while (Date.now() < deadline) {
		const count = await periodDateInputs(page).count();
		if (count === expected) {
			return;
		}
		await page.waitForTimeout(100);
	}
	throw new Error(`Expected ${expected} period date inputs, got ${await periodDateInputs(page).count()}`);
}

async function expectFilledDates(page: Page): Promise<void> {
	const inputs = periodDateInputs(page);
	const count = await inputs.count();
	if (count === 0) {
		throw new Error('No period date inputs found');
	}
	for (let index = 0; index < count; index += 1) {
		const value = await inputs.nth(index).inputValue();
		if (!value) {
			throw new Error(`Period date input ${index} is empty`);
		}
	}
}

export async function runSchoolPeriodDates(ctx: OnboardingRunContext): Promise<void> {
	const { page, base, credentials } = ctx;
	await signUpThroughUi(page, base, {
		name: credentials.name,
		email: credentials.email,
		password: credentials.password,
	});
	await expectOnboardingStep(page, 1);
	await fillSchoolIdentity(page, credentials.schoolName, credentials.city);

	await expectPeriodDateCount(page, 2);
	await expectFilledDates(page);

	const addTrimester = page.getByRole('button', { name: /add trimester|ajouter le trimestre/i });
	await waitForEnabled(addTrimester);
	await addTrimester.click();
	await expectPeriodDateCount(page, 4);
	await page.getByRole('button', { name: /remove|supprimer/i }).first().click();
	await expectPeriodDateCount(page, 2);

	const periodSection = page.locator('section').filter({ hasText: /active period|période active/i });
	const periodTypeTrigger = selectControl(periodSection).or(
		periodSection.getByRole('button').filter({ hasText: /trimester|trimestre|semester|semestre/i }),
	).first();
	await selectComboboxOption(page, periodTypeTrigger, {
		value: 'semester',
		name: /semester|semestre/i,
	});
	await expectPeriodDateCount(page, 2);
	await expectFilledDates(page);

	const addSemester = page.getByRole('button', { name: /add semester|ajouter le semestre/i });
	await waitForEnabled(addSemester);
	await addSemester.click();
	await expectPeriodDateCount(page, 4);
	await expectFilledDates(page);
	await page.getByRole('button', { name: /remove|supprimer/i }).first().click();
	await expectPeriodDateCount(page, 2);
}
