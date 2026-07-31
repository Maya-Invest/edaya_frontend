import { describe, expect, it } from 'bun:test';
import { parseMultiValueList } from '$lib/import/shared/parse-multi-value-list';

describe('parseMultiValueList', () => {
	it('splits on semicolon by default usage', () => {
		expect(parseMultiValueList('a;b; c', ';')).toEqual(['a', 'b', 'c']);
	});

	it('splits on ampersand', () => {
		expect(parseMultiValueList('a&b& c', '&')).toEqual(['a', 'b', 'c']);
	});

	it('returns empty for blank input', () => {
		expect(parseMultiValueList('   ', ';')).toEqual([]);
	});
});
