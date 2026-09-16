import type { OnboardingRunContext } from '../types';
import {
	expectOnboardingStep,
	signInWithPassword,
	signOutFromOnboarding,
	signUpThroughUi,
} from '../support/auth';
import { clickContinue, expectContinueDisabled, fillSchoolIdentity } from '../support/wizard';
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

	await signOutFromOnboarding(page);
	await signInWithPassword(page, base, credentials.email, credentials.password);
	await expectOnboardingStep(page, 2);
	if (!page.url().includes('/onboarding')) {
		throw new Error(`Owner resume should stay in the wizard, got ${page.url()}`);
	}

	await assertIncompleteWizardBouncesToStep(page, base, 2);
}
