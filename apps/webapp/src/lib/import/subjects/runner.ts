import type { getBrowserSchoolClient } from '$lib/api/school-client';

import type { ValidatedSubjectImportRow } from './types';

import { t } from '$lib/i18n';

import { formatImportRunErrorMessage } from '$lib/import/shared/format-import-run-error';

import {

	createSubjectForGradeLevel,

	createSubjectImportIdsForGradeLevel,

} from '$lib/subjects/create-subject-for-grade-level';

import { notifySubjectsListChanged } from '$lib/subjects/notify-subjects-list-changed';

import { get } from 'svelte/store';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface SubjectImportRunFailure {

	rowIndex: number;

	subjectName: string;

	message: string;

}

export interface SubjectImportRunResult {

	created: number;

	failed: SubjectImportRunFailure[];

	gradeLevelSubjectIds: string[];

}

export interface SubjectImportRunOptions {

	schoolId: string;

	academicYearId: string;

	client: SchoolClient;

	rows: readonly ValidatedSubjectImportRow[];

	onProgress?: (current: number, total: number) => void;

	seed?: string;

}

export async function runSubjectImport(options: SubjectImportRunOptions): Promise<SubjectImportRunResult> {
	const { schoolId, academicYearId, client, rows, onProgress, seed = Date.now().toString(36) } = options;

	const failed: SubjectImportRunFailure[] = [];

	const gradeLevelSubjectIds: string[] = [];

	const createdAt = new Date().toISOString();

	const total = rows.length;

	for (const [index, row] of rows.entries()) {
		onProgress?.(index, total);

		const { subjectId, gradeLevelSubjectId, classSubjectIdsByClassGroupId } = createSubjectImportIdsForGradeLevel(

			index,

			row.gradeLevelId,

			row.classGroupIds,

			seed,

		);

		try {
			const result = await createSubjectForGradeLevel(client, {

				schoolId,

				academicYearId,

				gradeLevelId: row.gradeLevelId,

				subjectId,

				gradeLevelSubjectId,

				classSubjectIdsByClassGroupId,

				name: row.nom,

				code: row.code,

				coefficient: row.coefficientValue,

				createdAt,

			});

			gradeLevelSubjectIds.push(result.gradeLevelSubjectId);
		}

		catch (error) {
			failed.push({

				rowIndex: row.rowIndex,

				subjectName: `${row.nom} (${row.niveau})`.trim(),

				message: formatImportRunErrorMessage(error, {

					entityLabel: row.nom,

				}, (key, params) => get(t)(key, params ?? {})),

			});
		}
	}

	onProgress?.(total, total);

	const result = {

		created: gradeLevelSubjectIds.length,

		failed,

		gradeLevelSubjectIds,

	};

	if (gradeLevelSubjectIds.length > 0) {
		try {
			notifySubjectsListChanged();
		}

		catch {

			// Import succeeded; roster notification is best-effort.

		}
	}

	return result;
}
