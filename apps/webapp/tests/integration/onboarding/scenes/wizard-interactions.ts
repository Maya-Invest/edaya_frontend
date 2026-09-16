import type { OnboardingRunContext } from '../types';
import { expectOnboardingStep, signUpThroughUi, waitForEnabled } from '../support/auth';
import {
	addInvalidStaffInviteRow,
	clickContinue,
	createSchoolButton,
	expectContinueDisabled,
	fillSchoolIdentity,
	selectCollegeAndOneClass,
	skipStepButton,
} from '../support/wizard';

export async function runWizardStepInteractions(ctx: OnboardingRunContext): Promise<void> {
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
	await expectContinueDisabled(page);

	await selectCollegeAndOneClass(page);
	await clickContinue(page);
	await expectOnboardingStep(page, 3);

	const skip = skipStepButton(page);
	await skip.waitFor({ state: 'visible', timeout: 15_000 });
	await addInvalidStaffInviteRow(page);
	await expectContinueDisabled(page);

	await waitForEnabled(skip);
	await skip.click();
	await expectOnboardingStep(page, 4);

	const createSchool = createSchoolButton(page);
	await waitForEnabled(createSchool);
}
