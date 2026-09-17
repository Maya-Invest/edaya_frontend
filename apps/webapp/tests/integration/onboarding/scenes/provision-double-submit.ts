import type { OnboardingRunContext } from '../types';
import { expectOnboardingStep, signUpThroughUi, waitForEnabled } from '../support/auth';
import {
	clickContinue,
	clickCreateSchoolAndWaitForProvision,
	expectBackLocked,
	fillSchoolIdentity,
	openDashboardButton,
	selectCollegeAndOneClass,
	skipStepButton,
} from '../support/wizard';

export async function runProvisionDoubleSubmit(ctx: OnboardingRunContext): Promise<void> {
	const { page, base, credentials } = ctx;
	await signUpThroughUi(page, base, {
		name: credentials.name,
		email: credentials.email,
		password: credentials.password,
	});
	await expectOnboardingStep(page, 1);
	await fillSchoolIdentity(page, credentials.schoolName, credentials.city);
	await clickContinue(page);
	await expectOnboardingStep(page, 2);
	await selectCollegeAndOneClass(page);
	await clickContinue(page);
	await expectOnboardingStep(page, 3);
	const skip = skipStepButton(page);
	await waitForEnabled(skip);
	await skip.click();
	await expectOnboardingStep(page, 4);

	await clickCreateSchoolAndWaitForProvision(page);
	await expectBackLocked(page);
	await waitForEnabled(openDashboardButton(page));
}
