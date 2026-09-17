import type { Page } from 'playwright';
import { VERIFICATION_COPY, expectOnboardingStep, signUpThroughUi } from '../support/auth';
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
		await page.getByText(VERIFICATION_COPY).waitFor({ state: 'visible', timeout: 10_000 });
		await expectOnboardingStep(verifiedPage, 1);
		if (page.url().includes('/onboarding')) {
			throw new Error('Original signup tab should stay on verification until the captured link is opened here');
		}
	}
	finally {
		await verifiedPage.close();
	}
}
