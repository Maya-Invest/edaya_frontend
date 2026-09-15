import type { OnboardingRunContext } from '../types';
import { expectOnboardingStep, signUpThroughUi } from '../support/auth';
import {
	clickContinue,
	createSchoolButton,
	expectBackLocked,
	fillSchoolIdentity,
	openDashboardButton,
	selectCollegeAndOneClass,
	skipStepButton,
	waitForProvisionHold,
} from '../support/wizard';
import { waitForEnabled } from '../../demo-dry-run/support/auth';
import {
	assertIncompleteWizardBouncesToStep,
	assertStepClamped,
} from './gates';

export async function runHappyPath(ctx: OnboardingRunContext): Promise<void> {
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

	await assertStepClamped(page, base, 4, 2);
	await assertIncompleteWizardBouncesToStep(page, base, 2);

	await selectCollegeAndOneClass(page);
	await clickContinue(page);
	await expectOnboardingStep(page, 3);

	const skip = skipStepButton(page);
	await waitForEnabled(skip);
	await skip.click();
	await expectOnboardingStep(page, 4);

	const createSchool = createSchoolButton(page);
	await waitForEnabled(createSchool);
	await createSchool.click();
	await waitForProvisionHold(page);
	await expectBackLocked(page);

	const openDashboard = openDashboardButton(page);
	await waitForEnabled(openDashboard);
	await openDashboard.click();
	await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
	await page.locator('aside#app-sidebar').waitFor({ state: 'visible', timeout: 30_000 });
}
