import type { ImportTypeKey } from '$lib/import/catalog/types';
import { writeModalSurface } from '$lib/modal/modal-url';

export const TOOL_MODAL_NAMES = [
	'import',
	'generate-timetable',
] as const;

export type ToolsModalName = (typeof TOOL_MODAL_NAMES)[number];

export const IMPORT_WORKFLOW_STEPS = ['settings', 'files', 'preview', 'execution', 'history'] as const;
export type ImportWorkflowStep = (typeof IMPORT_WORKFLOW_STEPS)[number];
const LEGACY_IMPORT_STEPS: Record<string, ImportWorkflowStep> = {
	download: 'settings',
	upload: 'files',
	validate: 'preview',
	execute: 'execution',
};

export function canonicalImportStep(step: string | null): ImportWorkflowStep {
	return isValue(step, IMPORT_WORKFLOW_STEPS) ? step : LEGACY_IMPORT_STEPS[step ?? ''] ?? 'settings';
}

/** Only changing steps preserves the same owner/draft. Batch, type and scope changes do not. */
export function retainsImportDraft(current: URL, destination: URL): boolean {
	if (current.origin !== destination.origin || current.pathname !== destination.pathname
		|| current.searchParams.get('task') !== 'import' || destination.searchParams.get('task') !== 'import') {
		return false;
	}
	const source = new URL(current);
	const target = new URL(destination);
	for (const url of [source, target]) {
		url.searchParams.delete('taskStep');
		url.searchParams.sort();
	}
	return source.search === target.search;
}

export const IMPORT_TYPE_TABS = [
	'students',
	'guardians',
	'staff',
	'teachers',
	'teacher_assignments',
	'classes',
	'subjects',
	'chapters',
	'billing',
	'payments',
	'academic_disciplines',
	'placement_statuses',
	'guardian_relationships',
	'class_offerings',
] as const satisfies readonly ImportTypeKey[];

export const TIMETABLE_GENERATION_STEPS = ['range', 'selection', 'review', 'success', 'error'] as const;
export type TimetableGenerationStep = (typeof TIMETABLE_GENERATION_STEPS)[number];

export const TIMETABLE_SETUP_TABS = ['subjects', 'periods', 'advanced'] as const;

export const TOOL_WORKFLOW_STEPS = [
	...IMPORT_WORKFLOW_STEPS,
	...Object.keys(LEGACY_IMPORT_STEPS),
	...TIMETABLE_GENERATION_STEPS,
	'setup', // Supported legacy address; canonicalized to range/selection.
] as const;

export const TOOL_WORKFLOW_TABS = [
	...IMPORT_TYPE_TABS,
	...TIMETABLE_SETUP_TABS,
] as const;

export interface ToolsWorkflowSurface {
	modal: ToolsModalName | null;
	step: string | null;
	tab: string | null;
}

export function canonicalToolsWorkflowSurface(
	surface: ToolsWorkflowSurface,
	allowedImportTabs: readonly ImportTypeKey[] = IMPORT_TYPE_TABS,
): ToolsWorkflowSurface {
	if (surface.modal === 'import') {
		return {
			modal: surface.modal,
			step: canonicalImportStep(surface.step),
			tab: isValue(surface.tab, allowedImportTabs)
				? surface.tab
				: allowedImportTabs[0] ?? null,
		};
	}
	if (surface.modal === 'generate-timetable') {
		return {
			modal: surface.modal,
			step: isValue(surface.step, TIMETABLE_GENERATION_STEPS)
				? surface.step
				: surface.step === 'setup' && (surface.tab === 'periods' || surface.tab === 'advanced') ? 'selection' : 'range',
			tab: isValue(surface.tab, TIMETABLE_SETUP_TABS) ? surface.tab : 'subjects',
		};
	}
	return { modal: null, step: null, tab: null };
}

function isValue<T extends string>(
	value: string | null,
	allowed: readonly T[],
): value is T {
	return value !== null && (allowed as readonly string[]).includes(value);
}

export function retiredTimetableModalHref(url: URL): string | null {
	const modal = url.searchParams.get('modal');
	return modal === 'publish-timetable' || modal === 'republish-timetable'
		? writeModalSurface(url, { modal: null })
		: null;
}

/** Generation steps/panels share one local draft; all other URL context must match. */
export function retainsGenerationDraft(current: URL, destination: URL): boolean {
	if (current.origin !== destination.origin || current.pathname !== destination.pathname
		|| current.searchParams.get('task') !== 'generate-timetable' || destination.searchParams.get('task') !== 'generate-timetable') {
		return false;
	}
	const source = new URL(current);
	const target = new URL(destination);
	for (const url of [source, target]) {
		url.searchParams.delete('taskStep');
		url.searchParams.delete('taskPanel');
		url.searchParams.sort();
	}
	return source.search === target.search;
}
