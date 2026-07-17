import { describe, expect, it } from 'bun:test';
import { csvCell } from '../../../src/lib/list/list-csv-export';

describe('list csv export', () => {
	it('escapes csv cells with commas and quotes', () => {
		expect(csvCell('plain')).toBe('plain');
		expect(csvCell('a,b')).toBe('"a,b"');
		expect(csvCell('say "hi"')).toBe('"say ""hi"""');
	});
});
