import type { DocumentTemplateKey } from '$lib/api/documents-types';
import { mutationErrorMessage } from '$lib/api/mutations/execute-mutation';
import { ApiError } from '@maya-invest/edaya-api-client';

export function documentRequestErrorMessage(error: unknown, templateKey: DocumentTemplateKey, translate: (key: string) => string): string {
	if (error instanceof ApiError && error.body && typeof error.body === 'object'
		&& 'code' in error.body && error.body.code === 'DOCUMENT_TIMETABLE_EMPTY') {
		if (templateKey === 'teacher-timetable.v1') {
			return translate('documents.teacherTimetableEmpty');
		}
		if (templateKey === 'class-timetable.v1') {
			return translate('documents.classTimetableEmpty');
		}
	}
	return mutationErrorMessage(error, undefined, translate);
}
