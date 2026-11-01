import type { PeriodDefinitionDayOfWeek } from '$lib/types/school';

export interface PeriodTemplateRow {
	label: string;
	order: number;
	startTime: string;
	endTime: string;
	isBreak: boolean;
}

export type PeriodDefinitionPresetId
	= | 'standard-secondary'
		| 'half-day-wednesday'
		| 'morning-only'
		| 'blank';

export interface PeriodDefinitionPreset {
	id: PeriodDefinitionPresetId;
	weekdays: PeriodDefinitionDayOfWeek[];
	/** Days whose afternoon slots (`startTime >= 12:00`) are non-teaching. */
	halfDays: PeriodDefinitionDayOfWeek[];
	template: PeriodTemplateRow[];
}

export const PERIOD_DEFINITION_WEEKDAYS: PeriodDefinitionDayOfWeek[] = [
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
	'sunday',
];

export const PERIOD_DEFINITION_WEEKDAY_LABEL_KEY: Record<PeriodDefinitionDayOfWeek, string> = {
	monday: 'day.full.Mon',
	tuesday: 'day.full.Tue',
	wednesday: 'day.full.Wed',
	thursday: 'day.full.Thu',
	friday: 'day.full.Fri',
	saturday: 'day.full.Sat',
	sunday: 'day.full.Sun',
};

const STANDARD_SECONDARY_TEMPLATE: PeriodTemplateRow[] = [
	{ label: 'Période 1', order: 1, startTime: '08:00', endTime: '08:45', isBreak: false },
	{ label: 'Période 2', order: 2, startTime: '08:45', endTime: '09:30', isBreak: false },
	{ label: 'Récréation', order: 3, startTime: '09:30', endTime: '09:45', isBreak: true },
	{ label: 'Période 3', order: 4, startTime: '09:45', endTime: '10:30', isBreak: false },
	{ label: 'Période 4', order: 5, startTime: '10:30', endTime: '11:15', isBreak: false },
	{ label: 'Période 5', order: 6, startTime: '11:15', endTime: '12:00', isBreak: false },
	{ label: 'Pause déjeuner', order: 7, startTime: '12:00', endTime: '13:30', isBreak: true },
	{ label: 'Période 6', order: 8, startTime: '13:30', endTime: '14:15', isBreak: false },
	{ label: 'Période 7', order: 9, startTime: '14:15', endTime: '15:00', isBreak: false },
	{ label: 'Récréation', order: 10, startTime: '15:00', endTime: '15:15', isBreak: true },
	{ label: 'Période 8', order: 11, startTime: '15:15', endTime: '16:00', isBreak: false },
];

const MORNING_ONLY_TEMPLATE: PeriodTemplateRow[] = [
	{ label: 'Période 1', order: 1, startTime: '08:00', endTime: '08:45', isBreak: false },
	{ label: 'Période 2', order: 2, startTime: '08:45', endTime: '09:30', isBreak: false },
	{ label: 'Récréation', order: 3, startTime: '09:30', endTime: '09:45', isBreak: true },
	{ label: 'Période 3', order: 4, startTime: '09:45', endTime: '10:30', isBreak: false },
	{ label: 'Période 4', order: 5, startTime: '10:30', endTime: '11:15', isBreak: false },
	{ label: 'Période 5', order: 6, startTime: '11:15', endTime: '12:00', isBreak: false },
];

const WEEKDAYS_MON_FRI: PeriodDefinitionDayOfWeek[] = [
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
];

export const PERIOD_DEFINITION_PRESETS: Record<PeriodDefinitionPresetId, PeriodDefinitionPreset> = {
	'standard-secondary': {
		id: 'standard-secondary',
		weekdays: [...WEEKDAYS_MON_FRI],
		halfDays: [],
		template: STANDARD_SECONDARY_TEMPLATE.map(row => ({ ...row })),
	},
	'half-day-wednesday': {
		id: 'half-day-wednesday',
		weekdays: [...WEEKDAYS_MON_FRI],
		halfDays: ['wednesday'],
		template: STANDARD_SECONDARY_TEMPLATE.map(row => ({ ...row })),
	},
	'morning-only': {
		id: 'morning-only',
		weekdays: [...WEEKDAYS_MON_FRI],
		halfDays: [],
		template: MORNING_ONLY_TEMPLATE.map(row => ({ ...row })),
	},
	'blank': {
		id: 'blank',
		weekdays: [...WEEKDAYS_MON_FRI],
		halfDays: [],
		template: [
			{ label: '', order: 1, startTime: '08:00', endTime: '08:45', isBreak: false },
		],
	},
};

export const PERIOD_DEFINITION_PRESET_IDS: PeriodDefinitionPresetId[] = [
	'standard-secondary',
	'half-day-wednesday',
	'morning-only',
	'blank',
];

export function clonePeriodDefinitionPreset(id: PeriodDefinitionPresetId): PeriodDefinitionPreset {
	const preset = PERIOD_DEFINITION_PRESETS[id];
	return {
		id: preset.id,
		weekdays: [...preset.weekdays],
		halfDays: [...preset.halfDays],
		template: preset.template.map(row => ({ ...row })),
	};
}

export function isTeachingSlotForExpandedRow(input: {
	dayOfWeek: PeriodDefinitionDayOfWeek;
	row: PeriodTemplateRow;
	halfDays: PeriodDefinitionDayOfWeek[];
}): boolean {
	if (input.row.isBreak) {
		return false;
	}
	if (input.halfDays.includes(input.dayOfWeek) && input.row.startTime >= '12:00') {
		return false;
	}
	return true;
}

export interface ExpandedPeriodDefinitionDraft {
	label: string;
	dayOfWeek: PeriodDefinitionDayOfWeek;
	order: number;
	startTime: string;
	endTime: string;
	isBreak: boolean;
	isTeachingSlot: boolean;
}

export function expandPeriodDefinitionTemplate(input: {
	template: PeriodTemplateRow[];
	weekdays: PeriodDefinitionDayOfWeek[];
	halfDays: PeriodDefinitionDayOfWeek[];
}): ExpandedPeriodDefinitionDraft[] {
	const orderedWeekdays = PERIOD_DEFINITION_WEEKDAYS.filter(day => input.weekdays.includes(day));
	return orderedWeekdays.flatMap(dayOfWeek =>
		input.template.map(row => ({
			label: row.label.trim(),
			dayOfWeek,
			order: row.order,
			startTime: row.startTime,
			endTime: row.endTime,
			isBreak: row.isBreak,
			isTeachingSlot: isTeachingSlotForExpandedRow({
				dayOfWeek,
				row,
				halfDays: input.halfDays,
			}),
		})),
	);
}
