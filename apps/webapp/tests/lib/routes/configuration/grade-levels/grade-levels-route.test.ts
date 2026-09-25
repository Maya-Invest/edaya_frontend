import { describe, expect, it } from 'bun:test';
import { gradeLevelIdFromUrl } from '../../../../../src/routes/(app)/configuration/grade-levels/lib/grade-levels-helpers';

describe('grade-levels route helpers', () => {
	it('parses grade level id from drawer URL', () => {
		const url = new URL('http://local/configuration/grade-levels/gl-6');
		expect(gradeLevelIdFromUrl(url)).toBe('gl-6');
	});
});
