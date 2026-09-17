import { describe, expect, it } from 'bun:test';
import { QA_TEMPLATE_MATRIX_MANUAL } from '../../../scripts/qa-template-matrix.manual';
import {
	AUTH_ONBOARDING_CATALOG_COVERAGE,
	assertAuthOnboardingCatalogCoverage,
} from './catalog-coverage';

describe('auth/onboarding catalog coverage', () => {
	it('maps every release-required Auth and Onboarding row', () => {
		const catalog = QA_TEMPLATE_MATRIX_MANUAL.filter(row => row.module === 'Auth' || row.module === 'Onboarding');
		expect(AUTH_ONBOARDING_CATALOG_COVERAGE).toHaveLength(catalog.length);
		expect(() => assertAuthOnboardingCatalogCoverage([
			'unauthenticated-redirect',
			'login-signup-ui',
			'owner-relogin',
			'invited-staff-relogin',
			'api-unavailable-banner',
			'invalid-invite',
			'invite-expired',
			'invite-revoked',
			'invited-staff',
			'invited-staff-existing',
			'happy-path',
			'wizard-step-interactions',
			'owner-wizard-resume',
			'school-period-dates',
		])).not.toThrow();
	});

	it('fails CI when a required scene is missing', () => {
		expect(() => assertAuthOnboardingCatalogCoverage(['login-signup-ui'])).toThrow(/Uncovered release-required/);
	});
});
