import { describe, expect, test } from 'bun:test';
import { runSelectionOperation } from '../../../src/lib/interaction/selection-operation';

describe('per-record selection operations', () => {
	test('keeps rejected and failed targets without replaying committed records', async () => {
		const calls: string[] = [];
		const result = await runSelectionOperation(['a', 'b', 'c'], async (id) => {
			calls.push(id);
			if (id === 'c')
				throw new Error('failed');
			return id === 'a';
		});
		expect(result).toEqual({ succeeded: ['a'], remaining: ['b', 'c'] });
		await runSelectionOperation(result.remaining, async (id) => {
			calls.push(id);
			return true;
		});
		expect(calls).toEqual(['a', 'b', 'c', 'b', 'c']);
	});
	test('stops issuing writes when the originating context is no longer current', async () => {
		let current = true;
		const result = await runSelectionOperation([1, 2, 3], async () => {
			current = false;
			return true;
		}, () => current);
		expect(result).toEqual({ succeeded: [1], remaining: [2, 3] });
	});
});
