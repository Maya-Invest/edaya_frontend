import { readModal } from '$lib/modal/modal-url';
import { describe, expect, it } from 'bun:test';
import {
	TOOL_MODAL_NAMES,
	canonicalToolsWorkflowSurface,
	canonicalImportStep,
	retainsImportDraft,
	retainsGenerationDraft,
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
			step: 'settings',
			tab: 'students',
		});
		expect(canonicalToolsWorkflowSurface({
			modal: 'generate-timetable',
			step: 'download',
			tab: 'payments',
		})).toEqual({
			modal: 'generate-timetable',
			step: 'range',
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
			step: 'files',
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

it('maps all legacy import stages to the five-stage task without executing anything', () => {
	for (const [legacy, canonical] of [['download', 'settings'], ['upload', 'files'], ['validate', 'preview'], ['execute', 'execution']] as const) {
		expect(canonicalImportStep(legacy!)).toBe(canonical);
	}
	for (const step of ['settings', 'files', 'preview', 'execution', 'history'] as const)
		expect(canonicalImportStep(step)).toBe(step);
	expect(canonicalImportStep('unsupported')).toBe('settings');
});

it('retains drafts only within the same import target, type and workspace context', () => {
	const source = new URL('https://school.test/configuration/tools?task=import&taskTarget=batch&taskStep=settings&taskPanel=students&year=2026');
	const next = new URL(source);
	next.searchParams.set('taskStep', 'files');
	expect(retainsImportDraft(source, next)).toBe(true);
	for (const [key, value] of [['taskTarget', 'another'], ['taskPanel', 'payments'], ['year', '2025'], ['task', 'generate-timetable']]) {
		const destination = new URL(next);
		destination.searchParams.set(key!, value!);
		expect(retainsImportDraft(source, destination)).toBe(false);
	}
	expect(retainsImportDraft(source, new URL('https://school.test/configuration/tools'))).toBe(false);
	expect(retainsImportDraft(source, new URL('https://other.test/configuration/tools?task=import'))).toBe(false);
});

it('canonicalizes legacy generation setup while preserving supported panels and results', () => {
	expect(canonicalToolsWorkflowSurface({ modal: 'generate-timetable', step: 'setup', tab: 'subjects' }).step).toBe('range');
	expect(canonicalToolsWorkflowSurface({ modal: 'generate-timetable', step: 'setup', tab: 'advanced' })).toEqual({ modal: 'generate-timetable', step: 'selection', tab: 'advanced' });
	for (const step of ['range', 'selection', 'review', 'success', 'error'])
		expect(canonicalToolsWorkflowSurface({ modal: 'generate-timetable', step, tab: 'subjects' }).step).toBe(step);
});
it('generation retains step and panel drafts but guards target, school, year and route changes', () => {
	const start = new URL('https://school.test/configuration/tools?task=generate-timetable&taskStep=range&taskPanel=subjects&year=2026');
	const selection = new URL(start);
	selection.searchParams.set('taskStep', 'selection');
	selection.searchParams.set('taskPanel', 'advanced');
	expect(retainsGenerationDraft(start, selection)).toBe(true);
	for (const [key, value] of [['year', '2025'], ['taskTarget', 'other'], ['task', 'import']]) {
		const next = new URL(selection);
		next.searchParams.set(key!, value!);
		expect(retainsGenerationDraft(start, next)).toBe(false);
	}
	expect(retainsGenerationDraft(start, new URL('https://school.test/configuration/tools'))).toBe(false);
});
