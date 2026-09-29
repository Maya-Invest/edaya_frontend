import type { Page } from 'playwright';
import { sendOtpThroughUi, verifyOtpThroughUi, peekOtp } from '../../support/passwordless';
import { expectOnboardingStep } from '../support/auth';
import { uniqueOnboardingEmail } from '../support/capture';
import { loginSignInPath } from '../support/paths';

export async function runLoginSignupUi(page: Page, base: string): Promise<void> {
  await page.goto(loginSignInPath(base), { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="auth-identifier"]:visible').waitFor({ state: 'visible' });
  if (await page.locator('input[type="password"]').count()) throw new Error('Password login must not be exposed');
  const email = uniqueOnboardingEmail();
  await sendOtpThroughUi(page, email);
  const valid = await peekOtp(email);
  await page.locator('[data-testid="auth-code"]:visible').fill(valid === '000000' ? '111111' : '000000');
  await page.locator('[data-testid="auth-submit"]:visible').click();
  await page.locator('[role="alert"]').first().waitFor({ state: 'visible' });
  if (page.url().includes('/onboarding')) throw new Error('Invalid OTP authenticated the account');
  await verifyOtpThroughUi(page, email);
  await expectOnboardingStep(page, 1);
}
