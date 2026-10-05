import type { Page } from 'playwright';
import { sendOtpThroughUi, verifyOtpThroughUi, revealTestCode } from '../../support/passwordless';
import { expectOnboardingStep } from '../support/auth';
import { uniqueOnboardingEmail } from '../support/capture';
import { loginSignInPath } from '../support/paths';
import type { ScenarioStep } from '../../support/scenario-registry';

export function loginSignupSteps<C>(page: Page, base: string, state: { email?: string; valid?: string } = {}): ScenarioStep<C>[] {
  return [
    { id: 'form', run: async () => {
      await page.goto(loginSignInPath(base), { waitUntil: 'domcontentloaded' });
      await page.locator('[data-testid="auth-identifier"]:visible').waitFor({ state: 'visible' });
      if (await page.locator('input[type="password"]').count()) throw new Error('Password login must not be exposed');
    }, checkpoint: { id: 'form', title: 'Email sign-in', surface: '/login', ready: async () => {
      await page.locator('[data-testid="auth-identifier"]:visible').waitFor();
    } } },
    { id: 'otp', run: async () => {
      state.email = uniqueOnboardingEmail();
      await sendOtpThroughUi(page, state.email);
      state.valid = await revealTestCode(page);
    }, checkpoint: { id: 'otp', title: 'Email verification', surface: '/login?stage=verification', ready: async () => {
      await page.locator('[data-testid="auth-code"]:visible').waitFor();
    } } },
    { id: 'validation', run: async () => {
      await page.locator('[data-testid="auth-code"]:visible').fill(state.valid === '000000' ? '111111' : '000000');
      await page.locator('[data-testid="auth-submit"]:visible').click();
      await page.locator('[role="alert"]').first().waitFor({ state: 'visible' });
      if (page.url().includes('/onboarding')) throw new Error('Invalid OTP authenticated the account');
    }, checkpoint: { id: 'validation', title: 'Invalid verification code', surface: '/login?stage=verification', ready: async () => {
      await page.locator('[role="alert"]').first().waitFor();
    } } },
    { id: 'complete-proof', run: async () => {
      await verifyOtpThroughUi(page, state.email!);
      await expectOnboardingStep(page, 1);
    } },
  ];
}

export async function runLoginSignupUi(page: Page, base: string): Promise<void> {
  for (const step of loginSignupSteps(page, base)) {
    await step.run(undefined);
    await step.checkpoint?.ready(undefined);
  }
}
