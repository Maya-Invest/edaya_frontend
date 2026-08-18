import { describe, expect, it } from 'bun:test';
import {
	appendModal,
	MODAL_QUERY_KEY,
	readModal,
	readModalStep,
	readModalTab,
	writeModal,
	writeModalSurface,
} from '$lib/modal/modal-url';

const allowed = ['create', 'edit', 'edit-profile'] as const;

describe('readModal', () => {
	it('returns null when the query param is missing', () => {
		const url = new URL('http://local/school/students');
		expect(readModal(url, allowed)).toBeNull();
	});

	it('returns a valid modal key from the query param', () => {
		const url = new URL('http://local/school/students?modal=create');
		expect(readModal(url, allowed)).toBe('create');
	});

	it('returns null for unknown values', () => {
		const url = new URL('http://local/school/students?modal=delete');
		expect(readModal(url, allowed)).toBeNull();
	});
});

describe('writeModal', () => {
	it('removes the query param when modal is null', () => {
		const url = new URL('http://local/school/students?modal=create&q=ada');
		expect(writeModal(url, null)).toBe('/school/students?q=ada');
	});

	it('sets the query param for an active modal', () => {
		const url = new URL('http://local/school/students?q=ada');
		expect(writeModal(url, 'create')).toBe('/school/students?q=ada&modal=create');
	});

	it('sets modalTarget when provided', () => {
		const url = new URL('http://local/school/students/stu-1');
		expect(writeModal(url, 'note', 'note-1')).toBe('/school/students/stu-1?modal=note&modalTarget=note-1');
	});

	it('removes modalTarget when clearing modal', () => {
		const url = new URL(
			'http://local/school/students/stu-1?modal=note&modalTarget=note-1&modalStep=details&modalTab=people',
		);
		expect(writeModal(url, null)).toBe('/school/students/stu-1');
	});

	it('replaces an existing modal value', () => {
		const url = new URL(`http://local/school/students?${MODAL_QUERY_KEY}=create`);
		expect(writeModal(url, 'edit')).toBe('/school/students?modal=edit');
	});
});

describe('modal workflow state', () => {
	it('reads allow-listed step and tab values', () => {
		const url = new URL(
			'http://local/configuration/tools?modal=import&modalStep=upload&modalTab=students',
		);
		expect(readModalStep(url, ['upload', 'review'])).toBe('upload');
		expect(readModalTab(url, ['students', 'staff'])).toBe('students');
	});

	it('rejects unknown step and tab values', () => {
		const url = new URL(
			'http://local/configuration/tools?modal=import&modalStep=secret&modalTab=unknown',
		);
		expect(readModalStep(url, ['upload', 'review'])).toBeNull();
		expect(readModalTab(url, ['students', 'staff'])).toBeNull();
	});

	it('writes the complete addressable modal surface', () => {
		const url = new URL('http://local/configuration/tools?q=active');
		expect(
			writeModalSurface(url, {
				modal: 'generate-timetable',
				target: 'class-1',
				step: 'schedule',
				tab: 'subjects',
			}),
		).toBe(
			'/configuration/tools?q=active&modal=generate-timetable&modalTarget=class-1&modalStep=schedule&modalTab=subjects',
		);
	});

	it('removes stale target, step and tab when opening a simple modal', () => {
		const url = new URL(
			'http://local/configuration/tools?modal=import&modalTarget=old&modalStep=review&modalTab=staff',
		);
		expect(writeModalSurface(url, { modal: 'publish-timetable' })).toBe(
			'/configuration/tools?modal=publish-timetable',
		);
	});
});

describe('appendModal', () => {
	it('returns the href unchanged when modal is undefined', () => {
		expect(appendModal('/school/students', undefined)).toBe('/school/students');
	});

	it('appends the modal query param', () => {
		expect(appendModal('/school/students', 'create')).toBe('/school/students?modal=create');
	});
});
