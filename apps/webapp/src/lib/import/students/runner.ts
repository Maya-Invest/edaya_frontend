import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ValidatedStudentImportRow } from './types';
import { t } from '$lib/i18n';
import { formatImportRunErrorMessage } from '$lib/import/shared/format-import-run-error';
import { notifyStudentsListChanged } from '$lib/students/notify-students-list-changed';
import { createStudentImportIds, registerAndEnrollStudent, StudentEnrollAfterRegisterFailedError } from '$lib/students/register-and-enroll-student';
import { get } from 'svelte/store';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface StudentImportRunFailure {
	rowIndex: number;
	studentName: string;
	message: string;
}

export interface StudentImportRunWarning {
	rowIndex: number;
	studentName: string;
	message: string;
}

export interface StudentImportRunResult {
	created: number;
	failed: StudentImportRunFailure[];
	warnings: StudentImportRunWarning[];
	studentIds: string[];
}

export interface StudentImportRunOptions {
	schoolId: string;
	client: SchoolClient;
	rows: readonly ValidatedStudentImportRow[];
	onProgress?: (current: number, total: number) => void;
	seed?: string;
	classNameById?: ReadonlyMap<string, string>;
}

export async function runStudentImport(options: StudentImportRunOptions): Promise<StudentImportRunResult> {
	const { schoolId, client, rows, onProgress, seed = Date.now().toString(36), classNameById } = options;
	const failed: StudentImportRunFailure[] = [];
	const warnings: StudentImportRunWarning[] = [];
	const studentIds: string[] = [];
	const createdAt = new Date().toISOString();
	const total = rows.length;

	for (const [index, row] of rows.entries()) {
		onProgress?.(index, total);
		const { studentId, enrollmentId } = createStudentImportIds(index, seed);

		const studentName = `${row.prenom} ${row.nom}`.trim();
		const errorContext = {
			entityLabel: row.classe,
			classGroupId: row.classGroupId,
			classNameById,
		};
		const formatError = (error: unknown) => formatImportRunErrorMessage(
			error,
			errorContext,
			(key, params) => get(t)(key, params ?? {}),
		);

		try {
			await registerAndEnrollStudent(client, {
				schoolId,
				studentId,
				enrollmentId,
				firstName: row.prenom,
				lastName: row.nom,
				...(row.classGroupId ? { classGroupId: row.classGroupId } : {}),
				birthDate: row.date_naissance,
				matricule: row.matricule,
				...(row.genre?.trim() ? { gender: row.genre.trim() } : {}),
				sendAccountInvitation: false,
				createdAt,
			});
			studentIds.push(studentId);
		}
		catch (error) {
			if (error instanceof StudentEnrollAfterRegisterFailedError) {
				studentIds.push(studentId);
				warnings.push({
					rowIndex: row.rowIndex,
					studentName,
					message: formatError(error.cause),
				});
			}
			else {
				failed.push({
					rowIndex: row.rowIndex,
					studentName,
					message: formatError(error),
				});
			}
		}
	}

	onProgress?.(total, total);

	const result = {
		created: studentIds.length,
		failed,
		warnings,
		studentIds,
	};

	if (studentIds.length > 0) {
		try {
			notifyStudentsListChanged();
		}
		catch {
			// Import succeeded; roster notification is best-effort.
		}
	}

	return result;
}
