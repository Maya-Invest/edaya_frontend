import { describe, expect, it } from 'bun:test';
import { activeClassGroupDetailTab } from '../../../../../src/routes/(app)/configuration/structure/classes/lib/class-group-detail-tabs';
import { classGroupIdFromUrl } from '../../../../../src/routes/(app)/configuration/structure/classes/lib/classes-helpers';

describe('classes route helpers', () => {
	it('parses class group id from drawer URL', () => {
		expect(classGroupIdFromUrl(new URL('http://local/configuration/structure/classes/ci-6a'))).toBe('ci-6a');
		expect(classGroupIdFromUrl(new URL('http://local/configuration/structure/classes/ci-6a/profile'))).toBe('ci-6a');
		expect(classGroupIdFromUrl(new URL('http://local/configuration/structure/classes/ci-6a/assignments'))).toBe('ci-6a');
	});

	it('resolves active tab from drawer path', () => {
		expect(activeClassGroupDetailTab('/configuration/structure/classes/ci-6a/profile', 'ci-6a')).toBe('profile');
		expect(activeClassGroupDetailTab('/configuration/structure/classes/ci-6a/assignments', 'ci-6a')).toBe('assignments');
		expect(activeClassGroupDetailTab('/configuration/structure/classes/ci-6a', 'ci-6a')).toBe('profile');
	});
});
