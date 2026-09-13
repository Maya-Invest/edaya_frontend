import { afterEach, describe, expect, it } from 'bun:test';
import { fetchInvitationPreview } from '$lib/api/invitation-data';

describe('fetchInvitationPreview', () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it('loads a pending invitation without minting an identity access token', async () => {
		const calls: { url: string; authorization: string | null }[] = [];
		globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			calls.push({
				url,
				authorization: new Headers(init?.headers).get('authorization'),
			});
			expect(init?.credentials).toBe('omit');
			return new Response(JSON.stringify({
				status: 'pending',
				kind: 'guardian',
				targetId: 'grd-1',
				expiresAt: '2026-12-31T00:00:00.000Z',
				schoolName: 'Edaya',
				inviteeName: 'Ada',
				contactChannel: 'email',
				contactEmail: 'ada@school.edu',
			}), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		}) as typeof fetch;

		const preview = await fetchInvitationPreview('invite-token');
		expect(preview.status).toBe('pending');
		expect(preview.kind).toBe('guardian');
		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toBe('http://localhost:8787/public/invitations/invite-token');
		expect(calls[0]?.authorization).toBeNull();
	});
});
