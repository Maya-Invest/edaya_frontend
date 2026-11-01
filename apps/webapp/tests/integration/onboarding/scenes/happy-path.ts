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

import type { ScenarioStep } from '../../support/scenario-registry';

/** Shared wizard steps: visual runs stop before school creation; tests continue through verification. */
export function happyPathSteps<C>(ctx: OnboardingRunContext, state: { colleagueEmail?: string } = {}): ScenarioStep<C>[] {
  const { page, base, credentials } = ctx;
  const checkpoint = (step: number) => ({ id: `step-${step}`, title: `Onboarding · step ${step}`,
    surface: `/onboarding?step=${step}`, ready: async () => {
      await expectOnboardingStep(page, step);
      await page.locator('main').waitFor({ state: 'visible' });
    } });
  return [
    { id: 'signup', run: async () => {
      await signUpThroughUi(page, base, { name: credentials.name, email: credentials.email, password: credentials.password });
      await expectOnboardingStep(page, 1);
      await expectContinueDisabled(page);
    }, checkpoint: checkpoint(1) },
    { id: 'school-identity', run: async () => {
      await fillSchoolIdentity(page, credentials.schoolName, credentials.city);
      await clickContinue(page);
      await expectOnboardingStep(page, 2);
      await assertStepClamped(page, base, 4, 2);
      await assertIncompleteWizardBouncesToStep(page, base, 2);
    }, checkpoint: checkpoint(2) },
    { id: 'structure', run: async () => {
      await selectCollegeAndOneClass(page);
      await clickContinue(page);
      await expectOnboardingStep(page, 3);
    }, checkpoint: checkpoint(3) },
    { id: 'staff', run: async () => {
      state.colleagueEmail = uniqueOnboardingEmail();
      await addValidStaffInviteRow(page, state.colleagueEmail);
      await clickContinue(page);
      await expectOnboardingStep(page, 4);
    }, checkpoint: checkpoint(4) },
    { id: 'provision-and-verify', run: async () => {
      const { invitedCount } = await clickCreateSchoolAndWaitForProvision(page);
      await expectBackLocked(page);
      const openDashboard = openDashboardButton(page);
      await waitForEnabled(openDashboard);
      await openDashboard.click();
      await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
      await page.locator('aside#app-sidebar').waitFor({ state: 'visible', timeout: 30_000 });
      await assertWizardStaffInviteSent(page, base, state.colleagueEmail!, invitedCount);
    } },
  ];
}

export async function runHappyPath(ctx: OnboardingRunContext): Promise<void> {
  for (const step of happyPathSteps(ctx)) {
    await step.run(undefined);
    await step.checkpoint?.ready(undefined);
  }
}
