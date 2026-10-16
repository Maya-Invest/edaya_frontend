import { describe, expect, it } from 'bun:test';
import { gradeLevelIdFromUrl } from '../../../../../src/routes/(app)/configuration/structure/levels/lib/grade-levels-helpers';

describe('grade-levels route helpers', () => {
	it('parses grade level id from the selected level filter', () => {
		const url = new URL('http://local/configuration/structure/subjects?gradeLevel=gl-6');
		expect(gradeLevelIdFromUrl(url)).toBe('gl-6');
	});
});
