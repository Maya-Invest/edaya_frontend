import { describe, expect, it } from 'bun:test';
import {
	nextClassGroupId,
	resolveGradeLevelKeyForClassId,
} from '$lib/school/next-class-group-id';

describe('resolveGradeLevelKeyForClassId', () => {
	it('maps uuid grade levels to gl-* when the name is a standard CI year', () => {
		const uuid = '43f01362-d76b-483c-ae56-3055eea3b8e4';
		expect(resolveGradeLevelKeyForClassId(uuid, 'Sixième')).toBe('gl-6');
		expect(resolveGradeLevelKeyForClassId(uuid, '6ème')).toBe('gl-6');
		expect(resolveGradeLevelKeyForClassId('gl-6', '6ème')).toBe('gl-6');
	});

	it('assigns 6c when two onboarding classes already use 6a and 6b', () => {
		const taken = new Set(['6a', '6b', '43f01362-d76b-483c-ae56-3055eea3b8e4']);
		const counts = new Map([['gl-6', 2]]);
		const uuid = '43f01362-d76b-483c-ae56-3055eea3b8e4';
		const key = resolveGradeLevelKeyForClassId(uuid, 'Sixième');
		expect(nextClassGroupId(key, taken, counts)).toBe('6c');
	});

	it('resolves fixture template ids and Première A / 1ERA codes', () => {
		expect(resolveGradeLevelKeyForClassId('ci-lycee:1ERA')).toBe('1era');
		expect(resolveGradeLevelKeyForClassId('ci-college:6EME')).toBe('6eme');
		expect(resolveGradeLevelKeyForClassId('uuid', 'Première A')).toBe('1era');
		expect(resolveGradeLevelKeyForClassId('uuid', '1ERA')).toBe('1era');
		expect(resolveGradeLevelKeyForClassId('uuid', 'Seconde C')).toBe('2ndc');

		const key = resolveGradeLevelKeyForClassId('ci-lycee:1ERA');
		expect(nextClassGroupId(key, new Set(), new Map())).toBe('1eraa');
	});
});
