import type { Page } from 'playwright';
import { expectOnboardingStep, signUpThroughUi } from '../support/auth';
import { uniqueOnboardingEmail, uniqueOnboardingPassword } from '../support/capture';

export async function runSignupCrossTab(page: Page, base: string): Promise<void> {
	const email = uniqueOnboardingEmail();
	const verifiedPage = await signUpThroughUi(page, base, {
		name: 'Cross Tab Owner',
		email,
		password: uniqueOnboardingPassword(),
		verifyInNewPage: true,
	});
	try {
		await expectOnboardingStep(page, 1);
		await expectOnboardingStep(verifiedPage, 1);
	}
	finally {
		await verifiedPage.close();
	}
}
