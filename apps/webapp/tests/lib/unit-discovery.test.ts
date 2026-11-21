import { resolve } from 'node:path';
import { expect, test } from 'bun:test';
import { unitInvocations } from '../../scripts/unit-tests';

test('the unit lane discovers every state suite once and excludes browser integration', () => {
	const root = resolve(import.meta.dirname, '../..');
	const calls = unitInvocations(root);
	const discovered = [...new Bun.Glob('tests/unit/**/*.test.ts').scanSync({ cwd: root })].sort();
	expect(calls[0]).toEqual(['test', '--isolate', 'tests/lib']);
	expect(calls.slice(1).map(call => call[1])).toEqual(discovered);
	expect(new Set(calls.map(call => call.join(' '))).size).toBe(calls.length);
	expect(calls.every(call => !call.join(' ').includes('tests/integration'))).toBe(true);
});
