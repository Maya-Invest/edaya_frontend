import { describe, expect, it } from 'bun:test';
import { buildSubjectChapterSummary } from '$lib/subjects/chapter-summary';

describe('buildSubjectChapterSummary', () => {
	it('joins up to three chapter titles', () => {
		expect(buildSubjectChapterSummary([
			'Les fractions',
			'Les décimaux',
		])).toBe('Les fractions · Les décimaux');
	});

	it('truncates long chapter lists', () => {
		expect(buildSubjectChapterSummary([
			'A',
			'B',
			'C',
			'D',
			'E',
		])).toBe('A · B · C (+2)');
	});

	it('returns empty string when no titles', () => {
		expect(buildSubjectChapterSummary(['', '   '])).toBe('');
	});
});
