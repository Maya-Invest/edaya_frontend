import { readModal } from '$lib/modal/modal-url';
import { describe, expect, it } from 'bun:test';
import {
	TOOL_MODAL_NAMES,
	canonicalToolsWorkflowSurface,
	retiredTimetableModalHref,
} from '../../../../../src/routes/(app)/configuration/tools/lib/tools-workflow';
import { teacherAssignmentsCompatibilityHref } from '../../../../../src/routes/(app)/school/teacher-assignments/teacher-assignments-redirect';

describe('tools route helpers', () => {
	it('redirects obsolete publication links to Tools without their modal state', () => {
		for (const modal of ['publish-timetable', 'republish-timetable']) {
			expect(retiredTimetableModalHref(new URL(`https://school.test/configuration/tools?modal=${modal}&modalStep=success&modalTab=conflicts&modalTarget=class-1`))).toBe('/configuration/tools');
		}
		expect(retiredTimetableModalHref(new URL('https://school.test/configuration/tools?modal=generate-timetable'))).toBeNull();
	});

	it('canonicalizes each tool to its safe initial workflow view', () => {
		expect(canonicalToolsWorkflowSurface({
			modal: 'import',
			step: null,
			tab: null,
		})).toEqual({
			modal: 'import',
			step: 'download',
			tab: 'students',
		});
		expect(canonicalToolsWorkflowSurface({
			modal: 'generate-timetable',
			step: 'download',
			tab: 'payments',
		})).toEqual({
			modal: 'generate-timetable',
			step: 'setup',
			tab: 'subjects',
		});
	});

	it('preserves allow-listed routed result views for local payload validation', () => {
		expect(canonicalToolsWorkflowSurface({
			modal: 'generate-timetable',
			step: 'success',
			tab: 'periods',
		})).toEqual({
			modal: 'generate-timetable',
			step: 'success',
			tab: 'periods',
		});
	});

	it('canonicalizes an inaccessible import type to the first permitted type', () => {
		expect(canonicalToolsWorkflowSurface({
			modal: 'import',
			step: 'upload',
			tab: 'students',
		}, ['staff'])).toEqual({
			modal: 'import',
			step: 'upload',
			tab: 'staff',
		});
	});

	it('classifies known denied tools modals as owned but not allowed', () => {
		for (const modal of TOOL_MODAL_NAMES) {
			const url = new URL(
				`https://school.test/configuration/tools?modal=${modal}&modalStep=setup`,
			);
			expect(readModal(url, [])).toBeNull();
			expect(TOOL_MODAL_NAMES).toContain(modal);
		}
	});

	it('ignores a modal surface owned by another route-level owner', () => {
		const url = new URL(
			'https://school.test/configuration/tools?modal=account-profile&modalStep=result',
		);
		const toolsModal = readModal(url, TOOL_MODAL_NAMES);
		expect(toolsModal).toBeNull();
		expect(TOOL_MODAL_NAMES).not.toContain('account-profile');
	});

	it('redirects the legacy teacher assignments route with safe list filters only', () => {
		const url = new URL(
			'https://school.test/school/teacher-assignments?q=ada&class=class-6&teacher=teacher-1&modal=create&token=secret',
		);
		expect(teacherAssignmentsCompatibilityHref(url)).toBe(
			'/configuration/tools/teacher-assignments?q=ada&class=class-6&teacher=teacher-1',
		);
	});
});
