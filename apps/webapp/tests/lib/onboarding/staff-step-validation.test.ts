import { isStaffStepValid, staffInviteCount } from '$lib/onboarding/staff-step-validation';
import { describe, expect, it } from 'bun:test';

describe('staff step validation', () => {
	it('allows empty invite list', () => {
		expect(isStaffStepValid([])).toBe(true);
	});

	it('requires valid email and role for active rows', () => {
		expect(isStaffStepValid([
			{ id: '1', email: 'secretary@school.edu', role: 'secretary' },
		])).toBe(true);

		expect(isStaffStepValid([
			{ id: '1', email: 'invalid', role: 'secretary' },
		])).toBe(false);

		expect(isStaffStepValid([
			{ id: '1', email: 'secretary@school.edu', role: '' },
		])).toBe(false);
	});

	it('rejects duplicate emails', () => {
		expect(isStaffStepValid([
			{ id: '1', email: 'secretary@school.edu', role: 'secretary' },
			{ id: '2', email: 'Secretary@school.edu', role: 'cpe' },
		])).toBe(false);
	});

	it('counts valid invites only', () => {
		expect(staffInviteCount([
			{ id: '1', email: 'a@school.edu', role: 'secretary' },
			{ id: '2', email: '', role: 'cpe' },
			{ id: '3', email: 'bad', role: 'accountant' },
		])).toBe(1);
	});
});
