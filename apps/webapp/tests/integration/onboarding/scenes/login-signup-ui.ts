import type { Page } from 'playwright';
import {
	VERIFICATION_COPY,
	ensurePasswordSignInPanel,
	expectOnboardingStep,
	followVerificationLink,
	openSignupPanel,
	passwordSignInSubmit,
	signupSubmitButton,
	waitForEnabled,
} from '../support/auth';
import { uniqueOnboardingEmail, uniqueOnboardingPassword } from '../support/capture';
import { loginSignInPath } from '../support/paths';

export async function runLoginSignupUi(page: Page, base: string): Promise<void> {
	await page.goto(loginSignInPath(base), { waitUntil: 'domcontentloaded' });
	await ensurePasswordSignInPanel(page);
	await page.locator('#login-password-email').waitFor({ state: 'visible', timeout: 15_000 });
	await page.locator('#login-password').waitFor({ state: 'visible', timeout: 15_000 });

	const emailInput = page.locator('#login-password-email');
	const passwordInput = page.locator('#login-password');
	const signIn = passwordSignInSubmit(page);
	await waitForEnabled(emailInput);
	await waitForEnabled(passwordInput);
	await emailInput.fill(`missing-${Date.now()}@integration.edaya.test`);
	await passwordInput.fill('WrongPassword1!');
	await waitForEnabled(signIn);
	await signIn.click();
	await page.locator('#login-password-error, [role="alert"]').first().waitFor({
		state: 'visible',
		timeout: 15_000,
	});

	await openSignupPanel(page, base);
	const nameInput = page.locator('#signup-name');
	const signupEmail = page.locator('#signup-email');
	const signupPassword = page.locator('#signup-password');
	const confirm = page.locator('#signup-confirm-password');
	const submit = signupSubmitButton(page);

	await nameInput.fill('Login Suite Owner');
	await signupEmail.fill(uniqueOnboardingEmail());
	await signupPassword.fill('short');
	await page.getByText(/at least 8|au moins 8/i).waitFor({ state: 'visible', timeout: 10_000 });
	if (!(await submit.isDisabled())) {
		throw new Error('Signup submit should stay disabled for a short password');
	}

	await signupPassword.fill('LongEnough1!');
	await confirm.fill('DifferentPass1!');
	await page.getByText(/do not match|ne correspondent pas/i).waitFor({ state: 'visible', timeout: 10_000 });
	if (!(await submit.isDisabled())) {
		throw new Error('Signup submit should stay disabled when passwords do not match');
	}

	const email = uniqueOnboardingEmail();
	const password = uniqueOnboardingPassword();
	await nameInput.fill('Login Suite Owner');
	await signupEmail.fill(email);
	await signupPassword.fill(password);
	await confirm.fill(password);
	await waitForEnabled(submit);
	await submit.click();
	await page.getByText(VERIFICATION_COPY).waitFor({ state: 'visible', timeout: 30_000 });
	if (page.url().includes('/onboarding')) {
		throw new Error(
			`Signup skipped email verification for ${email} (landed ${page.url()}). Set REQUIRE_EMAIL_VERIFICATION=true on Identity.`,
		);
	}

	await followVerificationLink(page, email, /\/onboarding/);
	await expectOnboardingStep(page, 1);
}
