import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ValidatedTeacherImportRow } from './types';
import { t } from '$lib/i18n';
import { formatImportRunErrorMessage } from '$lib/import/shared/format-import-run-error';
import { notifyTeachersListChanged } from '$lib/teachers/notify-teachers-list-changed';
import { createTeacherImportIds, saveTeacher } from '$lib/teachers/save-teacher';
import {
	createTeacherAssignmentImportId,
	saveTeacherAssignment,
} from '$lib/teachers/save-teacher-assignment';
import { get } from 'svelte/store';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface TeacherImportRunFailure {
	rowIndex: number;
	teacherName: string;
	message: string;
}

export interface TeacherImportRunResult {
	created: number;
	failed: TeacherImportRunFailure[];
	teacherIds: string[];
}

export interface TeacherImportRunOptions {
	schoolId: string;
	academicYearId: string;
	client: SchoolClient;
	rows: readonly ValidatedTeacherImportRow[];
	onProgress?: (current: number, total: number) => void;
	seed?: string;
}

export async function runTeacherImport(options: TeacherImportRunOptions): Promise<TeacherImportRunResult> {
	const { schoolId, academicYearId, client, rows, onProgress, seed = Date.now().toString(36) } = options;
	const failed: TeacherImportRunFailure[] = [];
	const teacherIds: string[] = [];
	const total = rows.length;

	for (const [index, row] of rows.entries()) {
		onProgress?.(index, total);
		const { teacherId } = createTeacherImportIds(index, seed);

		try {
			await saveTeacher(client, {
				schoolId,
				teacherId,
				firstName: row.prenom,
				lastName: row.nom,
				email: row.email,
				phone: row.telephone,
				subjectId: row.primarySubjectId ?? null,
			});

			const assignmentFailures: string[] = [];
			if (row.classGroupId && row.assignmentClassSubjectIds?.length) {
				for (const [assignmentIndex, classSubjectId] of row.assignmentClassSubjectIds.entries()) {
					try {
						await saveTeacherAssignment(client, {
							assignmentId: createTeacherAssignmentImportId(row.rowIndex, assignmentIndex, seed),
							teacherId,
							academicYearId,
							classGroupId: row.classGroupId,
							classSubjectId,
						});
					}
					catch (assignmentError) {
						assignmentFailures.push(
							formatImportRunErrorMessage(assignmentError, {
								entityLabel: row.matieres,
							}, (key, params) => get(t)(key, params ?? {})),
						);
					}
				}
			}

			teacherIds.push(teacherId);
			if (assignmentFailures.length > 0) {
				failed.push({
					rowIndex: row.rowIndex,
					teacherName: `${row.prenom} ${row.nom}`.trim(),
					message: assignmentFailures.join('; '),
				});
			}
		}
		catch (error) {
			failed.push({
				rowIndex: row.rowIndex,
				teacherName: `${row.prenom} ${row.nom}`.trim(),
				message: formatImportRunErrorMessage(error, {
					entityLabel: row.matieres,
				}, (key, params) => get(t)(key, params ?? {})),
			});
		}
	}

	onProgress?.(total, total);

	const result = {
		created: teacherIds.length,
		failed,
		teacherIds,
	};

	if (teacherIds.length > 0) {
		try {
			notifyTeachersListChanged();
		}
		catch {
			// Import succeeded; roster notification is best-effort.
		}
	}

	return result;
}
