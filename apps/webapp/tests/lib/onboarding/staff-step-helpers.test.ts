import { describe, expect, it } from 'bun:test';
import { namesFromInviteEmail } from '$lib/onboarding/names-from-email';
import { partitionStaffInvitesForSubmit } from '$lib/onboarding/staff-step-helpers';

describe('namesFromInviteEmail', () => {
	it('derives first and last name from email local part', () => {
		expect(namesFromInviteEmail('marie.dupont@school.fr')).toEqual({
			firstName: 'Marie',
			lastName: 'Dupont',
		});
	});

	it('falls back when only one token is present', () => {
		expect(namesFromInviteEmail('teacher@school.fr')).toEqual({
			firstName: 'Teacher',
			lastName: '—',
		});
	});
});

describe('partitionStaffInvitesForSubmit', () => {
	it('routes portal teachers separately from workspace staff invites', () => {
		const result = partitionStaffInvitesForSubmit([
			{ id: '1', email: 'teacher@school.fr', role: 'teacher' },
			{ id: '2', email: 'secretary@school.fr', role: 'secretary' },
			{ id: '3', email: '', role: '' },
		]);

		expect(result.teacherInvites).toEqual([{ email: 'teacher@school.fr', role: 'teacher' }]);
		expect(result.staffInvites).toEqual([{ email: 'secretary@school.fr', role: 'secretary' }]);
	});
});
