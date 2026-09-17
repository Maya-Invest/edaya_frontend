import type { OnboardingRunContext } from '../types';
import {
	expectOnboardingStep,
	signInWithPassword,
	signOutFromOnboarding,
	signUpThroughUi,
	waitForEnabled,
} from '../support/auth';
import { dashboardPath } from '../support/paths';
import {
	clickContinue,
	clickCreateSchoolAndWaitForProvision,
	expectBackLocked,
	expectContinueDisabled,
	fillSchoolIdentity,
	selectCollegeAndOneClass,
	skipStepButton,
} from '../support/wizard';
import { assertIncompleteWizardBouncesToStep } from './gates';

export async function runOwnerWizardResume(ctx: OnboardingRunContext): Promise<void> {
	const { page, base, credentials } = ctx;

	await signUpThroughUi(page, base, {
		name: credentials.name,
		email: credentials.email,
		password: credentials.password,
	});
	await expectOnboardingStep(page, 1);
	await expectContinueDisabled(page);
	await fillSchoolIdentity(page, credentials.schoolName, credentials.city);
	await clickContinue(page);
	await expectOnboardingStep(page, 2);

	await page.reload({ waitUntil: 'domcontentloaded' });
	await expectOnboardingStep(page, 2);

	const second = await page.context().newPage();
	try {
		await second.goto(dashboardPath(base), { waitUntil: 'domcontentloaded' });
		await expectOnboardingStep(second, 2);
	}
	finally {
		await second.close();
	}

	await signOutFromOnboarding(page);
	await signInWithPassword(page, base, credentials.email, credentials.password);
	await expectOnboardingStep(page, 2);
	if (!page.url().includes('/onboarding')) {
		throw new Error(`Owner resume should stay in the wizard, got ${page.url()}`);
	}

	await assertIncompleteWizardBouncesToStep(page, base, 2);

	await selectCollegeAndOneClass(page);
	await clickContinue(page);
	await expectOnboardingStep(page, 3);
	const skip = skipStepButton(page);
	await waitForEnabled(skip);
	await skip.click();
	await expectOnboardingStep(page, 4);

	await clickCreateSchoolAndWaitForProvision(page);
	await expectBackLocked(page);

	await page.reload({ waitUntil: 'domcontentloaded' });
	await expectOnboardingStep(page, 4);
	await expectBackLocked(page);
}
