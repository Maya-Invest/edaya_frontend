import type { ClassNode } from '$lib/types/school';
import { describe, expect, it } from 'bun:test';
import { classLabelForId, resolveActiveClassId } from '$lib/academic/class-selection';

const classes = [
	{ id: 'ci-6a', name: '6ème A' },
	{ id: 'ci-6b', name: '6ème B' },
] as ClassNode[];

describe('resolveActiveClassId', () => {
	it('returns the page class id when it exists', () => {
		expect(resolveActiveClassId('ci-6b', classes)).toBe('ci-6b');
	});

	it('falls back to the first class when the page id is missing or stale', () => {
		expect(resolveActiveClassId(undefined, classes)).toBe('ci-6a');
		expect(resolveActiveClassId('6a', classes)).toBe('ci-6a');
	});

	it('keeps the route class id while classes are still loading', () => {
		expect(resolveActiveClassId('ci-6b', [])).toBe('ci-6b');
	});
});

describe('classLabelForId', () => {
	it('returns the class name for a known id', () => {
		expect(classLabelForId('ci-6a', classes)).toBe('6ème A');
	});

	it('returns an empty string for an unknown id', () => {
		expect(classLabelForId('missing', classes)).toBe('');
	});
});
