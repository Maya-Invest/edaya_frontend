import { ApiError } from '@maya-invest/edaya-api-client';

export interface TimetableGenerationError {
	code?: string;
	summary: string;
	detail?: string;
	guidanceKeys: string[];
}

export type TimetableMutationResult<T>
	= | { ok: true; value: T }
		| { ok: false; error: TimetableGenerationError };

const TIMETABLE_ERROR_KEYS: Record<string, string> = {
	SCHEDULE_CONFLICT: 'timetable.errorScheduleConflict',
	TIMETABLE_WORKLOAD_UNSATISFIED: 'timetable.errorWorkloadUnsatisfied',
	TIMETABLE_WORKLOAD_REQUIRED: 'timetable.errorWorkloadRequired',
	TIMETABLE_TEACHER_ASSIGNMENT_REQUIRED: 'timetable.errorTeacherAssignmentRequired',
	TIMETABLE_RANGE_OUTSIDE_ACADEMIC_YEAR: 'timetable.errorRangeOutsideYear',
	TIMETABLE_SCOPE_NOT_FOUND: 'timetable.errorScopeNotFound',
};

const TIMETABLE_ERROR_GUIDANCE_KEYS: Record<string, string[]> = {
	TIMETABLE_WORKLOAD_UNSATISFIED: [
		'timetable.guidance.reduceSubjectGap',
		'timetable.guidance.checkTeacherAvailability',
		'timetable.guidance.adjustRange',
		'timetable.guidance.disableWorkloadEnforcement',
	],
	TIMETABLE_WORKLOAD_REQUIRED: [
		'timetable.guidance.setPeriodsPerWeek',
	],
	TIMETABLE_TEACHER_ASSIGNMENT_REQUIRED: [
		'timetable.guidance.assignTeachers',
		'timetable.guidance.allowUnassignedTeachers',
	],
	TIMETABLE_RANGE_OUTSIDE_ACADEMIC_YEAR: [
		'timetable.guidance.adjustRange',
	],
};

function apiDetail(error: unknown): { code?: string; message?: string; details?: Record<string, unknown> } {
	if (error instanceof ApiError && error.body && typeof error.body === 'object') {
		const body = error.body as { message?: unknown; code?: unknown; details?: unknown };
		return {
			code: typeof body.code === 'string' ? body.code : undefined,
			message: typeof body.message === 'string' ? body.message : undefined,
			details: body.details && typeof body.details === 'object' && !Array.isArray(body.details) ? body.details as Record<string, unknown> : undefined,
		};
	}
	return {};
}

type Translate = (key: string, vars?: Record<string, string | number>) => string;

interface TimetableErrorContext {
	classLabels?: Record<string, string>;
	classSubjectLabels?: Record<string, string>;
	locale?: string;
}

function workloadDetail(details: Record<string, unknown> | undefined, translate: Translate, context: TimetableErrorContext): string | undefined {
	if (!details || typeof details.classGroupId !== 'string' || typeof details.classSubjectId !== 'string'
		|| typeof details.weekKey !== 'string' || typeof details.placed !== 'number' || typeof details.required !== 'number'
		|| !Number.isInteger(details.placed) || !Number.isInteger(details.required) || details.placed < 0 || details.required <= details.placed) {
		return undefined;
	}
	const isTemplate = details.weekKey === '__template__';
	const date = new Date(`${details.weekKey}T12:00:00Z`);
	if (!isTemplate && (!/^\d{4}-\d{2}-\d{2}$/.test(details.weekKey) || Number.isNaN(date.getTime())))
		return undefined;
	return translate(isTemplate ? 'timetable.errorWorkloadTemplateDetail' : 'timetable.errorWorkloadDetail', {
		className: context.classLabels?.[details.classGroupId] ?? translate('timetable.errorUnknownClass'),
		subject: context.classSubjectLabels?.[details.classSubjectId] ?? translate('timetable.errorUnknownSubject'),
		placed: details.placed,
		required: details.required,
		missing: details.required - details.placed,
		week: isTemplate ? '' : new Intl.DateTimeFormat(context.locale ?? 'fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(date),
	});
}

export function parseTimetableGenerationError(
	error: unknown,
	translate: Translate,
	context: TimetableErrorContext = {},
): TimetableGenerationError {
	const { code, message: apiMessage, details } = apiDetail(error);
	const summaryKey = code ? TIMETABLE_ERROR_KEYS[code] : undefined;
	const summary = summaryKey
		? translate(summaryKey)
		: apiMessage ?? (error instanceof Error ? error.message : translate('timetable.operationFailed'));
	const detail = code === 'TIMETABLE_WORKLOAD_UNSATISFIED' ? workloadDetail(details, translate, context) : undefined;
	const guidanceKeys = code ? (TIMETABLE_ERROR_GUIDANCE_KEYS[code] ?? []) : [];

	return { code, summary, detail, guidanceKeys };
}

export function timetableErrorMessage(error: unknown, translate: (key: string) => string): string {
	return parseTimetableGenerationError(error, translate).summary;
}
