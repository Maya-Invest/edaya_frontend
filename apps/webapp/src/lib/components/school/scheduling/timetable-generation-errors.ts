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
	TIMETABLE_PUBLISHED_ALREADY_EXISTS: 'timetable.errorPublishedExists',
	TIMETABLE_DRAFT_ALREADY_EXISTS: 'timetable.errorDraftExists',
	TIMETABLE_SCHOOL_NOTHING_TO_GENERATE: 'timetable.errorSchoolNothingToGenerate',
	TIMETABLE_WORKLOAD_UNSATISFIED: 'timetable.errorWorkloadUnsatisfied',
	TIMETABLE_WORKLOAD_REQUIRED: 'timetable.errorWorkloadRequired',
	TIMETABLE_TEACHER_ASSIGNMENT_REQUIRED: 'timetable.errorTeacherAssignmentRequired',
	TIMETABLE_RANGE_OUTSIDE_ACADEMIC_YEAR: 'timetable.errorRangeOutsideYear',
	TIMETABLE_SCOPE_NOT_FOUND: 'timetable.errorScopeNotFound',
};

const TIMETABLE_ERROR_GUIDANCE_KEYS: Record<string, string[]> = {
	TIMETABLE_WORKLOAD_UNSATISFIED: [
		'timetable.guidance.disableWorkloadEnforcement',
		'timetable.guidance.reduceSubjectGap',
		'timetable.guidance.checkTeacherAvailability',
		'timetable.guidance.adjustRange',
	],
	TIMETABLE_WORKLOAD_REQUIRED: [
		'timetable.guidance.setPeriodsPerWeek',
	],
	TIMETABLE_TEACHER_ASSIGNMENT_REQUIRED: [
		'timetable.guidance.assignTeachers',
		'timetable.guidance.allowUnassignedTeachers',
	],
	TIMETABLE_PUBLISHED_ALREADY_EXISTS: [
		'timetable.guidance.useRepublish',
	],
	TIMETABLE_DRAFT_ALREADY_EXISTS: [
		'timetable.guidance.publishOrRepublish',
	],
	TIMETABLE_SCHOOL_NOTHING_TO_GENERATE: [
		'timetable.guidance.useRepublish',
		'timetable.guidance.adjustRange',
	],
	TIMETABLE_RANGE_OUTSIDE_ACADEMIC_YEAR: [
		'timetable.guidance.adjustRange',
	],
};

function apiDetail(error: unknown): { code?: string; message?: string } {
	if (error instanceof ApiError && error.body && typeof error.body === 'object') {
		const body = error.body as { message?: unknown; code?: unknown };
		return {
			code: typeof body.code === 'string' ? body.code : undefined,
			message: typeof body.message === 'string' ? body.message : undefined,
		};
	}
	return {};
}

export function parseTimetableGenerationError(
	error: unknown,
	translate: (key: string) => string,
): TimetableGenerationError {
	const { code, message: apiMessage } = apiDetail(error);
	const summaryKey = code ? TIMETABLE_ERROR_KEYS[code] : undefined;
	const summary = summaryKey
		? translate(summaryKey)
		: apiMessage ?? (error instanceof Error ? error.message : translate('timetable.operationFailed'));
	const detail = apiMessage && apiMessage !== summary ? apiMessage : undefined;
	const guidanceKeys = code ? (TIMETABLE_ERROR_GUIDANCE_KEYS[code] ?? []) : [];

	return { code, summary, detail, guidanceKeys };
}

export function timetableErrorMessage(error: unknown, translate: (key: string) => string): string {
	return parseTimetableGenerationError(error, translate).summary;
}
