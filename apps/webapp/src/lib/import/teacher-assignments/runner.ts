import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ValidatedTeacherAssignmentImportRow } from './types';
import { t } from '$lib/i18n';
import { formatImportRunErrorMessage } from '$lib/import/shared/format-import-run-error';
import { notifyTeachersListChanged } from '$lib/teachers/notify-teachers-list-changed';
import {
	createTeacherAssignmentImportId,
	saveTeacherAssignment,
} from '$lib/teachers/save-teacher-assignment';
import { get } from 'svelte/store';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface TeacherAssignmentImportRunFailure {
	rowIndex: number;
	label: string;
	message: string;
}

export interface TeacherAssignmentImportRunResult {
	created: number;
	failed: TeacherAssignmentImportRunFailure[];
	assignmentIds: string[];
}

export interface TeacherAssignmentImportRunOptions {
	academicYearId: string;
	client: SchoolClient;
	rows: readonly ValidatedTeacherAssignmentImportRow[];
	onProgress?: (current: number, total: number) => void;
	seed?: string;
}

export async function runTeacherAssignmentImport(
	options: TeacherAssignmentImportRunOptions,
): Promise<TeacherAssignmentImportRunResult> {
	const { academicYearId, client, rows, onProgress, seed = Date.now().toString(36) } = options;
	const failed: TeacherAssignmentImportRunFailure[] = [];
	const assignmentIds: string[] = [];
	const total = rows.length;

	for (const [index, row] of rows.entries()) {
		onProgress?.(index, total);
		const assignmentId = createTeacherAssignmentImportId(row.rowIndex, 0, seed);
		const label = `${row.teacherName} · ${row.classe} · ${row.matiere}`;

		try {
			await saveTeacherAssignment(client, {
				assignmentId,
				teacherId: row.teacherId,
				academicYearId,
				classGroupId: row.classGroupId,
				classSubjectId: row.classSubjectId,
			});
			assignmentIds.push(assignmentId);
		}
		catch (error) {
			failed.push({
				rowIndex: row.rowIndex,
				label,
				message: formatImportRunErrorMessage(error, {
					entityLabel: label,
				}, (key, params) => get(t)(key, params ?? {})),
			});
		}
	}

	onProgress?.(total, total);

	if (assignmentIds.length > 0) {
		try {
			notifyTeachersListChanged();
		}
		catch {
			// Import succeeded; roster notification is best-effort.
		}
	}

	return {
		created: assignmentIds.length,
		failed,
		assignmentIds,
	};
}
