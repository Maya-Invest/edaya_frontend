import { describe, expect, it } from 'bun:test';
import { detailNavigationSearch } from '$lib/navigation/detail-navigation';

describe('detailNavigationSearch', () => {
	it('keeps list filter params', () => {
		const url = new URL('http://local/school/students?q=ada&class=6a&status=active');
		expect(detailNavigationSearch(url)).toBe('?q=ada&class=6a&status=active');
	});

	it('strips drawer-only params when opening a detail route', () => {
		const url = new URL(
			'http://local/school/students?q=ada&modal=create&tab=grades&modalTarget=note-1',
		);
		expect(detailNavigationSearch(url)).toBe('?q=ada');
	});

	it('returns an empty string when only drawer params are present', () => {
		const url = new URL('http://local/school/students/ci-s1?modal=edit-profile&tab=profile');
		expect(detailNavigationSearch(url)).toBe('');
	});
});

 it('detail navigation drops task address but preserves collection state', () => {
	const url = new URL('https://local/classes/a/attendance?task=attendance-roll-call&taskTarget=a&taskStep=save&taskPanel=create&q=ada&view=list&tab=old');
	expect(detailNavigationSearch(url)).toBe('?q=ada&view=list');
 });
