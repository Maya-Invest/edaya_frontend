import type { OnboardingRunContext } from '../types';
import { expectOnboardingStep, signUpThroughUi, waitForEnabled } from '../support/auth';
import { uniqueOnboardingEmail } from '../support/capture';
import { assertWizardStaffInviteSent } from '../support/invite';
import {
	addValidStaffInviteRow,
	clickContinue,
	clickCreateSchoolAndWaitForProvision,
	expectBackLocked,
	expectContinueDisabled,
	fillSchoolIdentity,
	openDashboardButton,
	selectCollegeAndOneClass,
} from '../support/wizard';
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

	await expectContinueDisabled(page);
	await fillSchoolIdentity(page, credentials.schoolName, credentials.city);
	await clickContinue(page);
	await expectOnboardingStep(page, 2);

	await assertStepClamped(page, base, 4, 2);
	await assertIncompleteWizardBouncesToStep(page, base, 2);

	await selectCollegeAndOneClass(page);
	await clickContinue(page);
	await expectOnboardingStep(page, 3);

	const colleagueEmail = uniqueOnboardingEmail();
	await addValidStaffInviteRow(page, colleagueEmail);
	await clickContinue(page);
	await expectOnboardingStep(page, 4);

	const { invitedCount } = await clickCreateSchoolAndWaitForProvision(page);
	await expectBackLocked(page);

	const openDashboard = openDashboardButton(page);
	await waitForEnabled(openDashboard);
	await openDashboard.click();
	await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
	await page.locator('aside#app-sidebar').waitFor({ state: 'visible', timeout: 30_000 });
	await assertWizardStaffInviteSent(page, base, colleagueEmail, invitedCount);
}
