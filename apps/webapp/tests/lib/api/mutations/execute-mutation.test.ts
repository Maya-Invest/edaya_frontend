import type { MutationFeedback } from '$lib/api/mutations/execute-mutation';
import { describe, expect, it } from 'bun:test';
import { executeMutation, mutationErrorMessage } from '$lib/api/mutations/execute-mutation';
import { en } from '$lib/i18n/dictionaries/en';
import { fr } from '$lib/i18n/dictionaries/fr';
import { ApiError } from '@maya-invest/edaya-api-client';

function feedback(dictionary: Record<string, string> = en) {
	const events: string[] = [];
	const port: MutationFeedback = {
		bump: key => { events.push(`bump:${key}`); },
		success: message => { events.push(`success:${message}`); },
		error: message => { events.push(`error:${message}`); },
		translate: key => dictionary[key]!,
	};
	return { events, port };
}

describe('confirmed mutation outcomes', () => {
	it('applies, requests once, reconciles and bumps every family before success feedback', async () => {
		const { events, port } = feedback();
		const result = await executeMutation({
			apply: () => { events.push('apply'); },
			request: async () => { events.push('request'); return { id: 'saved' }; },
			onSuccess: () => { events.push('refresh'); },
			rollback: () => { events.push('rollback'); },
			versionKeys: ['students', 'guardians'],
			successMessage: 'Saved',
		}, port);
		expect(result).toEqual({ id: 'saved' });
		expect(events).toEqual(['apply', 'request', 'refresh', 'bump:students', 'bump:guardians', 'success:Saved']);
	});

	it('retains a confirmed write after refresh failure and never rolls back or repeats it', async () => {
		const { events, port } = feedback();
		let requests = 0;
		let visible = 'old';
		const result = await executeMutation({
			apply: () => { visible = 'saved'; },
			request: async () => { requests++; return 'receipt'; },
			onSuccess: async () => { throw new ApiError(503, {}); },
			rollback: () => { visible = 'old'; },
			versionKeys: ['billing'],
			successMessage: 'Saved',
		}, port);
		expect(result).toBe('receipt');
		expect(requests).toBe(1);
		expect(visible).toBe('saved');
		expect(events).toEqual(['bump:billing', `error:${en['mutation.savedRefreshFailed']}`]);
	});

	it.each([401, 409, 500])('rolls back a rejected request without retrying status %s', async (status) => {
		const { events, port } = feedback(fr);
		let requests = 0;
		let visible = 'old';
		const result = await executeMutation({
			apply: () => { visible = 'pending'; },
			request: async () => { requests++; throw new ApiError(status, {}); },
			rollback: () => { visible = 'old'; },
			versionKeys: ['billing'],
		}, port);
		expect(result).toBeNull();
		expect(visible).toBe('old');
		expect(requests).toBe(1);
		expect(events).toEqual([`error:${fr[status === 409 ? 'mutation.conflict' : 'mutation.failed']}`]);
	});

	it('preserves validation details and existing domain-specific deletion guidance', () => {
		const { port } = feedback();
		expect(mutationErrorMessage(new ApiError(400, { error: { issues: [{ message: 'Required name' }] } }), undefined, port.translate)).toBe('Required name');
		expect(mutationErrorMessage(new Error('ACTIVE_ENROLLMENTS'), 'Remove enrollments first', port.translate)).toBe('Remove enrollments first');
		expect(mutationErrorMessage(new ApiError(400, { message: 'Dependent records still exist' }), 'Remove links first', port.translate)).toBe('Remove links first');
	});

	it('uses both dictionaries for conflicts without exposing raw replay data', () => {
		for (const dictionary of [en, fr]) {
			const { port } = feedback(dictionary);
			expect(mutationErrorMessage(new ApiError(409, { message: 'internal-receipt-id' }), 'generic', port.translate)).toBe(dictionary['mutation.conflict']);
		}
	});
});
