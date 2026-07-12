import { ApiError } from '@maya-invest/edaya-api-client';

export interface ImportRunErrorContext {
	/** Human label from the import row (e.g. CSV `classe` or `nom`). */
	entityLabel?: string;
	classGroupId?: string;
	classNameById?: ReadonlyMap<string, string>;
}

const CLASS_CAPACITY_RE = /class group\s+(\S+)\s+has reached capacity/i;

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

export function extractRawImportErrorMessage(error: unknown): string | undefined {
	if (error instanceof ApiError) {
		return messageFromApiError(error);
	}
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	return undefined;
}

function resolveClassLabel(classGroupId: string, context: ImportRunErrorContext): string {
	const trimmedLabel = context.entityLabel?.trim();
	if (trimmedLabel) {
		return trimmedLabel;
	}

	const fromMap = context.classNameById?.get(classGroupId);
	if (fromMap?.trim()) {
		return fromMap.trim();
	}

	if (context.classGroupId && context.classGroupId === classGroupId) {
		const currentClass = context.classNameById?.get(context.classGroupId);
		if (currentClass?.trim()) {
			return currentClass.trim();
		}
	}

	return classGroupId;
}

function substituteClassIdsInMessage(
	message: string,
	classNameById?: ReadonlyMap<string, string>,
): string {
	if (!classNameById || classNameById.size === 0) {
		return message;
	}

	let output = message;
	for (const [classGroupId, className] of classNameById) {
		if (className.trim()) {
			output = output.replaceAll(classGroupId, className.trim());
		}
	}
	return output;
}

export function formatImportRunErrorMessage(
	error: unknown,
	context: ImportRunErrorContext,
	translate: (key: string, params?: Record<string, string | number>) => string,
): string {
	const raw = extractRawImportErrorMessage(error);
	if (!raw) {
		return translate('import.runErrors.generic');
	}

	const capacityMatch = raw.match(CLASS_CAPACITY_RE);
	if (capacityMatch?.[1]) {
		const classLabel = resolveClassLabel(capacityMatch[1], context);
		return translate('import.runErrors.classCapacityReached', { class: classLabel });
	}

	const substituted = substituteClassIdsInMessage(raw, context.classNameById);
	return substituted.trim().length > 0 ? substituted : translate('import.runErrors.generic');
}
