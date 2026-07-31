import { describe, expect, it } from 'bun:test';
import { namesFromInviteEmail } from '$lib/onboarding/names-from-email';
import { staffInvitesForSubmit } from '$lib/onboarding/staff-step-helpers';

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

describe('staffInvitesForSubmit', () => {
	it('submits only complete workspace staff invites', () => {
		expect(staffInvitesForSubmit([
			{ id: '1', email: 'secretary@school.fr', role: 'secretary' },
			{ id: '2', email: 'etudes@school.fr', role: 'studies_director' },
			{ id: '3', email: 'it@school.fr', role: 'it_admin' },
			{ id: '4', email: 'compta@school.fr', role: 'accountant' },
			{ id: '5', email: '', role: 'cpe' },
			{ id: '6', email: 'incomplete@school.fr', role: '' },
		])).toEqual([
			{ email: 'secretary@school.fr', role: 'secretary' },
			{ email: 'etudes@school.fr', role: 'studies_director' },
			{ email: 'it@school.fr', role: 'it_admin' },
			{ email: 'compta@school.fr', role: 'accountant' },
		]);
	});
});
