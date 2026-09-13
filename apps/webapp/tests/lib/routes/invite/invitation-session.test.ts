import { describe, expect, it } from 'bun:test';
import {
	canAcceptInvitationWithCurrentSession,
	invitationEmailMatchesSession,
	sessionBlocksInvitationAccept,
} from '../../../../src/routes/invite/[token]/invitation-session';

const guardianPreview = {
	kind: 'guardian',
	targetId: 'grd-new',
	contactEmail: 'parent@school.edu',
};

describe('invitation-session', () => {
	it('blocks a signed-in identity whose email does not match the invitation', () => {
		expect(sessionBlocksInvitationAccept(guardianPreview, {
			isLoggedIn: false,
			hasAuthAccount: true,
			userId: null,
			sessionKind: null,
			loginEmail: 'admin@school.edu',
		})).toBe(true);
	});

	it('does not block a staff session when the invitation email matches (parent who is also staff)', () => {
		expect(sessionBlocksInvitationAccept(guardianPreview, {
			isLoggedIn: true,
			hasAuthAccount: true,
			userId: 'st-admin',
			sessionKind: 'staff',
			loginEmail: 'parent@school.edu',
		})).toBe(false);
	});

	it('blocks a guardian session linked to a different guardian record', () => {
		expect(sessionBlocksInvitationAccept(guardianPreview, {
			isLoggedIn: true,
			hasAuthAccount: true,
			userId: 'grd-other',
			sessionKind: 'guardian',
			loginEmail: 'parent@school.edu',
		})).toBe(true);
	});

	it('allows accept with the current session when emails match', () => {
		expect(invitationEmailMatchesSession(guardianPreview, 'Parent@school.edu')).toBe(true);
		expect(canAcceptInvitationWithCurrentSession(guardianPreview, {
			hasAuthAccount: true,
			isLoggedIn: false,
			loginEmail: 'parent@school.edu',
		})).toBe(true);
	});

	it('does not allow accept with the current session when emails differ', () => {
		expect(canAcceptInvitationWithCurrentSession(guardianPreview, {
			hasAuthAccount: true,
			isLoggedIn: true,
			loginEmail: 'admin@school.edu',
		})).toBe(false);
	});
});
