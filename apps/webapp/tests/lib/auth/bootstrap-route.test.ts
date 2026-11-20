import { describe, expect, it } from 'bun:test';
import { shouldBootstrapAuthOnly } from '$lib/auth/bootstrap-route';

describe('shouldBootstrapAuthOnly', () => {
	it('skips school bootstrap on public auth routes', () => {
		expect(shouldBootstrapAuthOnly('/login')).toBe(true);
		expect(shouldBootstrapAuthOnly('/login/demo')).toBe(true);
		expect(shouldBootstrapAuthOnly('/invite/token-123')).toBe(true);
	});

	it('loads school bootstrap on app and onboarding routes', () => {
		expect(shouldBootstrapAuthOnly('/onboarding')).toBe(false);
		expect(shouldBootstrapAuthOnly('/onboarding/complete')).toBe(false);
		expect(shouldBootstrapAuthOnly('/dashboard')).toBe(false);
		expect(shouldBootstrapAuthOnly('/school/staff')).toBe(false);
	});
});
