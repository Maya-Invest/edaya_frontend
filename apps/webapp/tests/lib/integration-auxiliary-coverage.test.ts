import { describe, expect, test } from 'bun:test';
import { assertAvailabilityResults, assertDemoResults } from '../integration/support/auxiliary-coverage';

describe('required availability and demo execution', () => {
	const outcomes = ['en.disabled', 'en.failed', 'en.enabled', 'fr.disabled', 'fr.failed', 'fr.enabled'].map(scenario => ({ scenario, status: 'passed' }));
	test('requires both translations and all availability modes', () => {
		expect(() => assertAvailabilityResults({ outcomes })).not.toThrow();
		for (const invalid of [[], outcomes.slice(1), [...outcomes.slice(1), outcomes[1]!], outcomes.map((row, index) => index === 0 ? { ...row, status: 'failed' } : row)]) {
			expect(() => assertAvailabilityResults({ outcomes: invalid })).toThrow();
		}
	});
	test('rejects absent, failed, skipped and inconsistent demo execution', () => {
		const summary = { passed: 1, failed: 0, skipped: 0, results: [{ status: 'pass' }] };
		expect(() => assertDemoResults(summary)).not.toThrow();
		for (const invalid of [{}, { ...summary, results: [] }, { ...summary, failed: 1 }, { ...summary, skipped: 1 }, { ...summary, passed: 2 }, { ...summary, results: [{ status: 'skip' }] }]) {
			expect(() => assertDemoResults(invalid)).toThrow();
		}
	});
});
