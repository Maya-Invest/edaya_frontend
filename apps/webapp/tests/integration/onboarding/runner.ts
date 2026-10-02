import { runTestOtpLifecycle, runPhoneOtp, runOtpResend, runOtpExpiry, runAccountSecurity, runOwnerTotpPolicy } from './scenes/passwordless-security';
import type { Browser, Page } from 'playwright';
import { assertAuthOnboardingCatalogCoverage } from './catalog-coverage';
import { captureFailure, uniqueOnboardingEmail, uniqueOnboardingPassword } from './support/capture';
import { assertStackReady } from './support/auth';
import { ONBOARDING_WEBAPP_BASE } from './support/paths';
import { runApiUnavailableBanner } from './scenes/api-unavailable-banner';
import { assertPublicAuthGates } from './scenes/gates';
import { runHappyPath } from './scenes/happy-path';
import { runInvalidInvite } from './scenes/invalid-invite';
import { runInviteAlreadyAccepted } from './scenes/invite-already-accepted';
import { runInviteExpired } from './scenes/invite-expired';
import { runInviteRevoked } from './scenes/invite-revoked';
import { runInviteWrongAccount } from './scenes/invite-wrong-account';
import { runInvitedGuardian } from './scenes/invited-guardian';
import { runInvitedStaff } from './scenes/invited-staff';
import { runInvitedStaffExisting } from './scenes/invited-staff-existing';
import { runInvitedStaffRelogin } from './scenes/invited-staff-relogin';
import { runInvitedStaffSecondSchool } from './scenes/invited-staff-second-school';
import { runInvitedTeacher } from './scenes/invited-teacher';
import { runLoginSignupUi } from './scenes/login-signup-ui';
import { runOwnerRelogin } from './scenes/owner-relogin';
import { runOwnerWizardResume } from './scenes/owner-resume';
import { runProvisionBootstrapRetry } from './scenes/provision-bootstrap-retry';
import { runProvisionDoubleSubmit } from './scenes/provision-double-submit';
import { runSchoolPeriodDates } from './scenes/school-period-dates';
import { runSignupCrossTab } from './scenes/signup-cross-tab';
import { runWizardStepInteractions } from './scenes/wizard-interactions';
import type { OnboardingCredentials, OnboardingSuiteSummary } from './types';

import { runScenarios } from '../support/scenario-registry';
import { ONBOARDING_SCENARIOS, type OnboardingScenarioId } from './scenarios';

export interface RunOnboardingSuiteOptions {
 browser: Browser;
 base?: string;
 outDir: string;
}
function uniqueOwner(name: string, schoolPrefix: string): OnboardingCredentials {
 return { email: uniqueOnboardingEmail(), password: uniqueOnboardingPassword(), name, schoolName: `${schoolPrefix} ${Date.now()}`, city: 'Abidjan' };
}
export async function runOnboardingSuite(options: RunOnboardingSuiteOptions): Promise<OnboardingSuiteSummary> {
 const base = options.base ?? ONBOARDING_WEBAPP_BASE;
 await assertStackReady(base);
 const owner = uniqueOwner('Onboarding Owner', 'Onboarding School');
 const ownerContext = await options.browser.newContext({ viewport: { width: 1440, height: 900 } });
 const ownerPage = await ownerContext.newPage();
 let invitedStaff = { token: '', email: '', password: '' };
 const isolated = async (run: (page: Page) => Promise<void>, id: string) => {
  const context = await options.browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try { await run(page); }
  catch (error) { await captureFailure(page, options.outDir, id); throw error; }
  finally { await context.close(); }
 };
 const wizard = (run: typeof runHappyPath, name: string) => isolated(page => run({ page, browser: options.browser, base, outDir: options.outDir, credentials: uniqueOwner(name, name) }), name);
 const handlers: Record<OnboardingScenarioId, () => Promise<void>> = {
  'auth.testing.otp': () => isolated(page => runTestOtpLifecycle(page, base), 'auth.testing.otp'),
  'auth.phone.sms-switch': () => isolated(page => runPhoneOtp(page, base, 'sms'), 'auth.phone.sms-switch'),
  'auth.phone.whatsapp': () => isolated(page => runPhoneOtp(page, base, 'whatsapp'), 'auth.phone.whatsapp'),
  'auth.email.resend': () => isolated(page => runOtpResend(page, base), 'auth.email.resend'),
  'auth.email.expiry': () => isolated(page => runOtpExpiry(page, base), 'auth.email.expiry'),
  'auth.account.security': () => isolated(page => runAccountSecurity(page, base), 'auth.account.security'),
  'unauthenticated-redirect': () => isolated(page => assertPublicAuthGates(page, base), 'unauthenticated-redirect'),
  'login-signup-ui': () => isolated(page => runLoginSignupUi(page, base), 'login-signup-ui'),
  'api-unavailable-banner': () => isolated(page => runApiUnavailableBanner(page, base), 'api-unavailable-banner'),
  'signup-cross-tab': () => isolated(page => runSignupCrossTab(page, base), 'signup-cross-tab'),
  'invalid-invite': () => isolated(page => runInvalidInvite(page, base), 'invalid-invite'),
  'invite-expired': () => isolated(page => runInviteExpired(page, base), 'invite-expired'),
  'wizard-step-interactions': () => wizard(runWizardStepInteractions, 'wizard-step-interactions'),
  'school-period-dates': () => wizard(runSchoolPeriodDates, 'school-period-dates'),
  'owner-wizard-resume': () => wizard(runOwnerWizardResume, 'owner-wizard-resume'),
  'provision-double-submit': () => wizard(runProvisionDoubleSubmit, 'provision-double-submit'),
  'provision-bootstrap-retry': () => wizard(runProvisionBootstrapRetry, 'provision-bootstrap-retry'),
  'happy-path': () => runHappyPath({ page: ownerPage, browser: options.browser, base, outDir: options.outDir, credentials: owner }),
  'invited-staff': async () => { invitedStaff = await runInvitedStaff(ownerPage, options.browser, base); },
  'invited-staff-relogin': () => isolated(page => runInvitedStaffRelogin(page, base, invitedStaff), 'invited-staff-relogin'),
  'invited-staff-second-school': () => runInvitedStaffSecondSchool(options.browser, base, options.outDir, invitedStaff),
  'invited-staff-existing': () => runInvitedStaffExisting(ownerPage, options.browser, base),
  'invite-wrong-account': () => runInviteWrongAccount(ownerPage, base),
  'invite-revoked': () => runInviteRevoked(ownerPage, options.browser, base),
  'invite-already-accepted': () => runInviteAlreadyAccepted(options.browser, base, invitedStaff.token),
  'invited-teacher': () => runInvitedTeacher(ownerPage, options.browser, base),
  'invited-guardian': () => runInvitedGuardian(ownerPage, options.browser, base),
  'auth.owner.totp-policy': () => runOwnerTotpPolicy(ownerPage, base, owner.email),
  'owner-relogin': () => isolated(page => runOwnerRelogin(page, base, owner), 'owner-relogin'),
 };
 try {
  const results = await runScenarios(ONBOARDING_SCENARIOS, async scenario => {
   console.log(`→ ${scenario.id}`);
   process.env.EDAYA_SCENARIO_ID = scenario.id;
   process.env.EDAYA_ARTIFACT_DIR = options.outDir;
   try { await handlers[scenario.id as OnboardingScenarioId](); }
   catch (error) { await captureFailure(ownerPage, options.outDir, `${scenario.id}-owner`); throw error; }
  });
  const scenes = results.map(result => ({ ...result, ok: result.status === 'passed' }));
  const ok = results.every(result => result.status === 'passed');
  const catalog = assertAuthOnboardingCatalogCoverage(results.map(result => result.id));
  return { generatedAt: new Date().toISOString(), ok, base, email: owner.email, schoolName: owner.schoolName, scenes, catalog: { ...catalog, manual: 0 } };
 } finally { await ownerContext.close(); }
}
