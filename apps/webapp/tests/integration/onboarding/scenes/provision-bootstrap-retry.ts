import type { OnboardingRunContext } from '../types';
import { expectOnboardingStep, signUpThroughUi, waitForEnabled } from '../support/auth';
import {
	clickContinue,
	clickCreateSchoolAndWaitForProvision,
	expectBackLocked,
	fillSchoolIdentity,
	openDashboardButton,
	retryBootstrapButton,
	selectCollegeAndOneClass,
	skipStepButton,
} from '../support/wizard';

export async function runProvisionBootstrapRetry(ctx: OnboardingRunContext): Promise<void> {
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

	await page.route('**/authorization/effective-grants**', route => route.abort());
	try {
		await clickCreateSchoolAndWaitForProvision(page);
		await expectBackLocked(page);
		const retry = retryBootstrapButton(page);
		await retry.waitFor({ state: 'visible', timeout: 30_000 });
		await page.unroute('**/authorization/effective-grants**');
		await waitForEnabled(retry);
		await retry.click();
		await waitForEnabled(openDashboardButton(page));
	}
	finally {
		await page.unroute('**/authorization/effective-grants**').catch(() => undefined);
	}
}
