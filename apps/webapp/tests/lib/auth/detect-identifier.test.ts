import { describe, expect, test } from 'bun:test';
import { detectIdentifier } from '../../../src/lib/auth/detect-identifier';

describe('login contact detection', () => {
	test('normalizes email without confusing numeric addresses with phones', () => {
		expect(detectIdentifier('  Staff@School.Example  ')).toEqual({ kind: 'email', value: 'staff@school.example' });
		expect(detectIdentifier('0712345678@example.com')?.kind).toBe('email');
	});
	test('normalizes formatted international phones', () => {
		for (const input of ['+2250712345678', ' +225 (07) 12-34.56 78 '])
			expect(detectIdentifier(input)).toEqual({ kind: 'phone', value: '+2250712345678' });
		// Detection is independent of the server's supported-country policy.
		expect(detectIdentifier('+14165551234')?.kind).toBe('phone');
	});
	test('rejects incomplete and ambiguous contacts', () => {
		for (const input of ['', 'staff', 'staff@', 'staff@.example', 'staff @school.example', '0712345678', '002250712345678', '+22507', '+0250712345678', '+22507abc12345', '++2250712345678', '+1234567890123456', `${'a'.repeat(250)}@example.com`])
			expect(detectIdentifier(input)).toBeNull();
	});
});
