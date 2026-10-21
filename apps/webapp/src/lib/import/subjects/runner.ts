import type { getBrowserSchoolClient } from '$lib/api/school-client';

import type { ValidatedSubjectImportRow } from './types';

import { defaultSubjectCategoryId, loadSubjectCategories } from '$lib/api/subject-categories-data';
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

	subjectIds: string[];

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

	const subjectIds: string[] = [];

	const createdAt = new Date().toISOString();
	const categories = await loadSubjectCategories(client, schoolId);
	const categoryId = defaultSubjectCategoryId(categories);
	if (!categoryId) {
		throw new Error('No subject category is configured');
	}

	const total = rows.length;

	for (const [index, row] of rows.entries()) {
		onProgress?.(index, total);

		const { subjectId, classSubjectIdsByClassGroupId } = createSubjectImportIdsForGradeLevel(

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

				classSubjectIdsByClassGroupId,

				name: row.nom,

				code: row.abbreviation,

				coefficient: row.coefficientValue,

				categoryId,

				createdAt,

			});

			subjectIds.push(result.subjectId);
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

		created: subjectIds.length,

		failed,

		subjectIds,

	};

	if (subjectIds.length > 0) {
		try {
			notifySubjectsListChanged();
		}

		catch {

			// Import succeeded; roster notification is best-effort.

		}
	}

	return result;
}
