import type {
	GenerateClassResult,
	GenerateSchoolResult,
} from '$lib/api/mutations/timetable-generation.mutations';
import type { components } from '$lib/api/schema';
import type { ClassSubjectInstructorSources } from '$lib/api/teacher-display';
import type { ScheduleDayOfWeek } from '$lib/scheduling/planning-calendar';
import type { PeriodDefinition } from '$lib/types/school';
import { teacherNameForClassSubject } from '$lib/api/teacher-display';
import { formatDateInput } from '$lib/date/format';
import { SCHEDULE_DAY_TO_PLANNING } from '$lib/scheduling/planning-calendar';
import { cn } from '$lib/utils';

export function timetableGenerationModalContentClass(
	phase: 'setup' | 'generating' | 'success' | 'error',
): string {
	return cn(
		phase === 'setup'
			? 'h-[min(90dvh,52.8rem)] max-h-[min(90dvh,52.8rem)] max-w-3xl'
			: 'max-w-2xl',
	);
}

export const TIMETABLE_GENERATION_MODAL_SETUP_BODY_CLASS
	= 'flex min-h-0 flex-1 flex-col overflow-y-auto space-y-0';

export const TIMETABLE_GENERATION_MODAL_SETUP_LAYOUT_CLASS
	= 'flex min-h-0 flex-1 flex-col gap-4';

export const TIMETABLE_GENERATION_MODAL_TAB_PANEL_CLASS
	= 'min-h-64 flex-1 lg:overflow-hidden';

export type ClassSubject = components['schemas']['ClassSubject'];

export interface TimetableRangePreset {
	id: string;
	label: string;
	startDate: string;
	endDate: string;
}

const PREFERRED_PERIOD_WEEKDAYS: ScheduleDayOfWeek[] = [
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
];

export interface PreferredPeriodWeekCell {
	id: string;
	label: string;
}

export type PreferredPeriodWeekEntry
	= | {
		kind: 'break';
		rowKey: string;
		label: string;
		startTime: string;
		endTime: string;
	}
	| {
		kind: 'slot';
		rowKey: string;
		label: string;
		startTime: string;
		endTime: string;
		cells: Partial<Record<ScheduleDayOfWeek, PreferredPeriodWeekCell>>;
	};

export interface PreferredPeriodWeekGrid {
	weekDays: ScheduleDayOfWeek[];
	entries: PreferredPeriodWeekEntry[];
}

export function preferredPeriodDayLabelKey(day: ScheduleDayOfWeek): string {
	return `day.${SCHEDULE_DAY_TO_PLANNING[day]}`;
}

export function buildPreferredPeriodWeekGrid(periods: PeriodDefinition[]): PreferredPeriodWeekGrid | null {
	if (!periods.some(period => period.dayOfWeek)) {
		return null;
	}

	const weekDays = PREFERRED_PERIOD_WEEKDAYS.filter(day =>
		periods.some(period => period.dayOfWeek === day),
	);
	if (!weekDays.length) {
		return null;
	}

	const orders = [...new Set(periods.map(period => period.order))].sort((left, right) => left - right);
	const entries: PreferredPeriodWeekEntry[] = [];

	for (const order of orders) {
		const rowPeriods = periods.filter(period => period.order === order);
		const template = rowPeriods[0];
		if (!template) {
			continue;
		}

		if (template.isBreak) {
			entries.push({
				kind: 'break',
				rowKey: `break-${order}`,
				label: template.label,
				startTime: template.startTime,
				endTime: template.endTime,
			});
			continue;
		}

		const cells: Partial<Record<ScheduleDayOfWeek, PreferredPeriodWeekCell>> = {};
		for (const period of rowPeriods) {
			if (!period.dayOfWeek || period.isBreak || period.isTeachingSlot === false) {
				continue;
			}
			cells[period.dayOfWeek] = { id: period.id, label: period.label };
		}

		if (Object.keys(cells).length === 0) {
			continue;
		}

		entries.push({
			kind: 'slot',
			rowKey: `slot-${order}`,
			label: template.label,
			startTime: template.startTime,
			endTime: template.endTime,
			cells,
		});
	}

	return entries.length ? { weekDays, entries } : null;
}

export function buildTimetableRangePresets(input: {
	periods: Array<{ id: string; label: string; startDate?: string | null; endDate?: string | null }>;
	yearStart?: string | null;
	yearEnd?: string | null;
}): TimetableRangePreset[] {
	const presets: TimetableRangePreset[] = [];
	for (const period of input.periods) {
		const startDate = formatDateInput(period.startDate);
		const endDate = formatDateInput(period.endDate);
		if (startDate && endDate) {
			presets.push({ id: period.id, label: period.label, startDate, endDate });
		}
	}
	const yearStart = formatDateInput(input.yearStart);
	const yearEnd = formatDateInput(input.yearEnd);
	if (yearStart && yearEnd) {
		presets.push({
			id: 'full-year',
			label: '',
			startDate: yearStart,
			endDate: yearEnd,
		});
	}
	return presets;
}

export function summarizeClassGeneration(result: GenerateClassResult) {
	return {
		sessionCount: result.sessions.length,
		placementCount: result.placements.length,
		unmetCount: result.unmetWorkloads.length,
		isComplete: result.unmetWorkloads.length === 0,
	};
}

export function summarizeSchoolGeneration(result: GenerateSchoolResult) {
	const placementCount = result.classGroups.reduce((sum, row) => sum + row.placements.length, 0);
	const unmetCount = result.classGroups.reduce((sum, row) => sum + row.unmetWorkloads.length, 0);
	const sessionCount = result.classGroups.reduce((sum, row) => sum + row.sessions.length, 0);
	return {
		classCount: result.classGroups.length,
		skippedCount: result.skippedClassGroupIds.length,
		placementCount,
		unmetCount,
		sessionCount,
		isComplete: unmetCount === 0,
	};
}

export function activeRangePresetId(
	presets: TimetableRangePreset[],
	startDate: string,
	endDate: string,
): string | null {
	return presets.find(preset => preset.startDate === startDate && preset.endDate === endDate)?.id ?? null;
}

export function buildTeacherLabelsByClassSubject(
	classSubjectIds: string[],
	sources: ClassSubjectInstructorSources,
): Record<string, string> {
	const labels: Record<string, string> = {};
	for (const classSubjectId of classSubjectIds) {
		const name = teacherNameForClassSubject(classSubjectId, sources, '');
		if (name) {
			labels[classSubjectId] = name;
		}
	}
	return labels;
}
