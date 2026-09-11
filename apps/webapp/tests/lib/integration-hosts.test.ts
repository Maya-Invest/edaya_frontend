import { describe, expect, it } from 'bun:test';
import { isIdentityPath } from '../integration/support/integration-hosts';

describe('integration identity routing', () => {
	it('sends auth and seed verification to identity', () => {
		expect(isIdentityPath('/auth/sign-in/email')).toBe(true);
		expect(isIdentityPath('/auth/edaya/access-token')).toBe(true);
		expect(isIdentityPath('/dev/seed/mark-email-verified')).toBe(true);
	});

	it('keeps school business routes on the API origin', () => {
		expect(isIdentityPath('/core/onboarding/register-school')).toBe(false);
		expect(isIdentityPath('/public/invitations/token/accept')).toBe(false);
	});
});
