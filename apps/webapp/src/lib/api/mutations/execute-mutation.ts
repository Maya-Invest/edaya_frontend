import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import { ApiError } from '@maya-invest/edaya-api-client';

export interface MutationOptions<T> {
	request: () => Promise<T>;
	apply?: () => void;
	rollback?: () => void;
	onSuccess?: (result: T) => void | Promise<void>;
	versionKeys?: EntityVersionKey[];
	errorMessage?: string;
	successMessage?: string;
}

export interface MutationFeedback {
	bump: (key: EntityVersionKey) => void;
	success: (message: string) => void;
	error: (message: string) => void;
	translate: (key: string) => string;
}

function messageFromApiError(error: ApiError): string | undefined {
	if (error.body && typeof error.body === 'object') {
		const body = error.body as Record<string, unknown>;
		if (typeof body.message === 'string') {
			return body.message;
		}
		if (typeof body.error === 'string') {
			return body.error;
		}
		const nestedError = body.error;
		if (nestedError && typeof nestedError === 'object') {
			const issues = (nestedError as Record<string, unknown>).issues;
			if (Array.isArray(issues)) {
				const firstIssue = issues[0];
				if (firstIssue && typeof firstIssue === 'object' && typeof (firstIssue as Record<string, unknown>).message === 'string') {
					return (firstIssue as Record<string, string>).message;
				}
			}
		}
		if (Array.isArray(body.issues)) {
			const firstIssue = body.issues[0];
			if (firstIssue && typeof firstIssue === 'object' && typeof (firstIssue as Record<string, unknown>).message === 'string') {
				return (firstIssue as Record<string, string>).message;
			}
		}
	}
	return undefined;
}

export function mutationErrorMessage(error: unknown, fallback: string | undefined, translate: MutationFeedback['translate']): string {
	if (error instanceof ApiError) {
		const body = error.body as { code?: string; message?: string; details?: { conflicts?: { kind: string; id: string }[]; assessmentIds?: string[]; lessonSessionIds?: string[]; classSubjectId?: string; actualRevision?: number } } | undefined;
		const calendarErrors: Record<string, string> = {
			ACADEMIC_YEAR_ARCHIVED: 'academic.archivedReadOnly',
			ACADEMIC_YEAR_EXCLUDES_PERIODS: 'academic.excludesPeriods',
			ACADEMIC_PERIOD_OUTSIDE_YEAR: 'academic.outsideYear',
			ACADEMIC_PERIOD_OVERLAP: 'academic.overlap',
			ACADEMIC_YEAR_NOT_DRAFT: 'academic.draftRequired',
			ACADEMIC_PERIOD_NOT_DRAFT: 'academic.draftRequired',
			ACADEMIC_YEAR_HAS_DEPENDENCIES: 'academic.dependencies',
			ACADEMIC_PERIOD_HAS_DEPENDENCIES: 'academic.dependencies',
			ACADEMIC_PERIOD_PARENT_IMMUTABLE: 'academic.parentImmutable',
			ACADEMIC_YEAR_ENROLLMENT_CONFLICT: 'academic.enrollmentConflict',
		};
		if (body?.code && calendarErrors[body.code])
			return translate(calendarErrors[body.code]);
		if (body?.code?.startsWith('SUBJECT_')) {
			const details = body.details;
			const ids = [...(details?.conflicts?.map(row => `${row.kind}: ${row.id}`) ?? []), ...(details?.assessmentIds ?? []), ...(details?.lessonSessionIds ?? [])];
			return [body.message ?? translate('mutation.conflict'), ids.join(', ')].filter(Boolean).join(' — ');
		}
		if (error.status === 409) {
			return translate('mutation.conflict');
		}
		const message = messageFromApiError(error);
		if (message && /dependent records still exist/i.test(message) && fallback) {
			return fallback;
		}
		return message ?? fallback ?? translate('mutation.failed');
	}
	if (error instanceof Error && error.message === 'ACTIVE_ENROLLMENTS' && fallback) {
		return fallback;
	}
	return error instanceof Error && error.message.trim().length > 0
		? error.message
		: fallback ?? translate('mutation.failed');
}

/** One request only. A failed refresh cannot undo a confirmed server commit. */
export async function executeMutation<T>(options: MutationOptions<T>, feedback: MutationFeedback): Promise<T | null> {
	let result: T;
	try {
		options.apply?.();
		result = await options.request();
	}
	catch (error) {
		try {
			options.rollback?.();
		}
		finally {
			feedback.error(mutationErrorMessage(error, options.errorMessage, feedback.translate));
		}
		return null;
	}

	let refreshFailed = false;
	try {
		await options.onSuccess?.(result);
	}
	catch {
		refreshFailed = true;
	}
	for (const key of options.versionKeys ?? []) {
		feedback.bump(key);
	}
	if (refreshFailed) {
		feedback.error(feedback.translate('mutation.savedRefreshFailed'));
	}
	else if (options.successMessage) {
		feedback.success(options.successMessage);
	}
	return result;
}
