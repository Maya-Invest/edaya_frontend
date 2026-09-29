import type { ScenarioDefinition } from '../support/scenario-registry';

export const ONBOARDING_SCENARIOS = [
  { id: 'auth.phone.telegram', feature: 'authentication.phone' },
  { id: 'auth.phone.whatsapp', feature: 'authentication.phone' },
  { id: 'auth.email.resend', feature: 'authentication.email' },
  { id: 'auth.email.expiry', feature: 'authentication.email' },
  { id: 'auth.account.security', feature: 'authentication.security' },
	{ id: 'unauthenticated-redirect', feature: 'authentication' },
	{ id: 'login-signup-ui', feature: 'authentication' },
	{ id: 'api-unavailable-banner', feature: 'authentication' },
	{ id: 'signup-cross-tab', feature: 'authentication' },
	{ id: 'invalid-invite', feature: 'invitation' },
	{ id: 'invite-expired', feature: 'invitation' },
	{ id: 'wizard-step-interactions', feature: 'onboarding' },
	{ id: 'school-period-dates', feature: 'onboarding' },
	{ id: 'owner-wizard-resume', feature: 'onboarding' },
	{ id: 'provision-double-submit', feature: 'onboarding' },
	{ id: 'provision-bootstrap-retry', feature: 'onboarding' },
	{ id: 'happy-path', feature: 'onboarding' },
	{ id: 'invited-staff', feature: 'invitation', dependsOn: ['happy-path'] },
	{ id: 'invited-staff-relogin', feature: 'invitation', dependsOn: ['invited-staff'] },
	{ id: 'invited-staff-second-school', feature: 'invitation', dependsOn: ['invited-staff'] },
	{ id: 'invited-staff-existing', feature: 'invitation', dependsOn: ['happy-path'] },
	{ id: 'invite-wrong-account', feature: 'invitation', dependsOn: ['happy-path'] },
	{ id: 'invite-revoked', feature: 'invitation', dependsOn: ['happy-path'] },
	{ id: 'invite-already-accepted', feature: 'invitation', dependsOn: ['invited-staff'] },
	{ id: 'invited-teacher', feature: 'invitation', dependsOn: ['happy-path'] },
	{ id: 'invited-guardian', feature: 'invitation', dependsOn: ['happy-path'] },
	{ id: 'owner-relogin', feature: 'onboarding', dependsOn: ['happy-path'] },
  { id: 'auth.owner.totp-policy', feature: 'authentication.security', dependsOn: ['happy-path', 'owner-relogin'] },
] as const satisfies readonly ScenarioDefinition[];

export type OnboardingScenarioId = typeof ONBOARDING_SCENARIOS[number]['id'];
