import { describe, expect, it } from 'bun:test';
import {
	nextClassGroupId,
	resolveGradeLevelKeyForClassId,
} from '$lib/school/next-class-group-id';

describe('resolveGradeLevelKeyForClassId', () => {
	it('maps template ids and seed ids to gl-*', () => {
		expect(resolveGradeLevelKeyForClassId('ci-college:6EME')).toBe('gl-6');
		expect(resolveGradeLevelKeyForClassId('gl-6')).toBe('gl-6');
		expect(resolveGradeLevelKeyForClassId('ci-lycee:1ERA')).toBe('gl-1era');
	});

	it('assigns 6c when two onboarding classes already use 6a and 6b', () => {
		const taken = new Set(['6a', '6b']);
		const counts = new Map([['gl-6', 2]]);
		const key = resolveGradeLevelKeyForClassId('ci-college:6EME');
		expect(nextClassGroupId(key, taken, counts)).toBe('6c');
	});

	it('resolves lycée template ids for class id prefixes', () => {
		expect(resolveGradeLevelKeyForClassId('ci-lycee:2NDC')).toBe('gl-2');
		const key = resolveGradeLevelKeyForClassId('ci-lycee:1ERA');
		expect(nextClassGroupId(key, new Set(), new Map())).toBe('1eraa');
	});
});
