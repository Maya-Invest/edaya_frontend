import { describe, expect, test } from 'bun:test';
import { runDemoDryRun } from './runner';

describe('demo dry-run', () => {
	test(
		'director and coordinator demo scenes',
		async () => {
			const summary = await runDemoDryRun();
			expect(summary.failed).toBe(0);
		},
		{ timeout: 1_200_000 },
	);
});
