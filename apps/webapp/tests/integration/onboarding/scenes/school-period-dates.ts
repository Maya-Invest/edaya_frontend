import type { Page } from 'playwright';
import { expectOnboardingStep, signUpThroughUi } from '../support/auth';
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

async function expectPeriodFieldsUncovered(page: Page): Promise<void> {
	const inputs = periodDateInputs(page);
	for (let index = 0; index < await inputs.count(); index++) {
		const field = inputs.nth(index);
		await field.scrollIntoViewIfNeeded();
		const uncovered = await field.evaluate(element => {
			const bounds = element.getBoundingClientRect();
			return document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2) === element;
		});
		if (!uncovered) throw new Error('The onboarding footer covers a period date field');
	}
	const lastPeriod = await inputs.last().boundingBox();
	const footer = await page.locator('[data-onboarding-step] footer').boundingBox();
	if (!lastPeriod || !footer || footer.y < lastPeriod.y + lastPeriod.height)
		throw new Error('The onboarding actions must follow the period fields');
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

	await expectPeriodDateCount(page, 6);
	await expectFilledDates(page);

	await page.getByRole('radio', { name: /trimester|trimestre/i }).waitFor({ state: 'visible' });
	if (await page.getByRole('button', { name: /add trimester|ajouter le trimestre|add semester|ajouter le semestre|remove|supprimer/i }).count())
		throw new Error('Period count must be controlled only by its type');
	await expectPeriodFieldsUncovered(page);
	await page.screenshot({ path: `${ctx.outDir}/wizard-school-periods-desktop-fr.png`, fullPage: true });
	await page.setViewportSize({ width: 390, height: 600 });
	await expectPeriodFieldsUncovered(page);
	await page.screenshot({ path: `${ctx.outDir}/wizard-school-periods-mobile-fr.png`, fullPage: true });
	await page.setViewportSize({ width: 1440, height: 900 });

	const semester = page.getByRole('radio', { name: /semester|semestre/i });
	await semester.check();
	await expectPeriodDateCount(page, 4);
	await expectFilledDates(page);
	await page.screenshot({ path: `${ctx.outDir}/wizard-school-semesters-desktop-fr.png`, fullPage: true });
	await page.reload({ waitUntil: 'domcontentloaded' });
	await expectOnboardingStep(page, 1);
	await expectPeriodDateCount(page, 4);
	if (!await semester.isChecked()) throw new Error('Semester selection must survive reload');
	await semester.focus();
	await page.keyboard.press('ArrowLeft');
	await expectPeriodDateCount(page, 6);
	if (!await page.getByRole('radio', { name: /trimester|trimestre/i }).isChecked())
		throw new Error('Arrow keys must select the trimester radio');
	await expectFilledDates(page);
}
