import type { ImportTypeKey } from '$lib/import/catalog/types';

export const TOOL_MODAL_NAMES = [
	'import',
	'generate-timetable',
	'publish-timetable',
] as const;

export type ToolsModalName = (typeof TOOL_MODAL_NAMES)[number];

export const IMPORT_WORKFLOW_STEPS = ['download', 'upload', 'validate', 'execute'] as const;
export type ImportWorkflowStep = (typeof IMPORT_WORKFLOW_STEPS)[number];

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
] as const satisfies readonly ImportTypeKey[];

export const TIMETABLE_GENERATION_STEPS = ['setup', 'success', 'error'] as const;
export type TimetableGenerationStep = (typeof TIMETABLE_GENERATION_STEPS)[number];

export const TIMETABLE_SETUP_TABS = ['subjects', 'periods', 'advanced'] as const;

export const TIMETABLE_PUBLISH_STEPS = ['setup', 'result'] as const;
export type TimetablePublishStep = (typeof TIMETABLE_PUBLISH_STEPS)[number];

export const TOOL_WORKFLOW_STEPS = [
	...IMPORT_WORKFLOW_STEPS,
	...TIMETABLE_GENERATION_STEPS,
	...TIMETABLE_PUBLISH_STEPS,
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

export function shouldCloseUnavailablePublishWorkflow(input: {
	modal: ToolsModalName | null;
	shellReady: boolean;
	planningStatus: 'idle' | 'loading' | 'ready' | 'error';
	publishableClassCount: number;
}): boolean {
	return input.modal === 'publish-timetable'
		&& input.shellReady
		&& input.planningStatus === 'ready'
		&& input.publishableClassCount === 0;
}

export function canonicalToolsWorkflowSurface(
	surface: ToolsWorkflowSurface,
	allowedImportTabs: readonly ImportTypeKey[] = IMPORT_TYPE_TABS,
): ToolsWorkflowSurface {
	if (surface.modal === 'import') {
		return {
			modal: surface.modal,
			step: isValue(surface.step, IMPORT_WORKFLOW_STEPS) ? surface.step : 'download',
			tab: isValue(surface.tab, allowedImportTabs)
				? surface.tab
				: allowedImportTabs[0] ?? null,
		};
	}
	if (surface.modal === 'generate-timetable') {
		return {
			modal: surface.modal,
			step: isValue(surface.step, TIMETABLE_GENERATION_STEPS) ? surface.step : 'setup',
			tab: isValue(surface.tab, TIMETABLE_SETUP_TABS) ? surface.tab : 'subjects',
		};
	}
	if (surface.modal === 'publish-timetable') {
		return {
			modal: surface.modal,
			step: isValue(surface.step, TIMETABLE_PUBLISH_STEPS) ? surface.step : 'setup',
			tab: null,
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
