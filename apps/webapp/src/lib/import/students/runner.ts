import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ValidatedStudentImportRow } from './types';
import { notifyStudentsListChanged } from '$lib/students/notify-students-list-changed';
import { createStudentImportIds, registerAndEnrollStudent } from '$lib/students/register-and-enroll-student';
import { ApiError } from '@maya-invest/edaya-api-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface StudentImportRunFailure {
	rowIndex: number;
	studentName: string;
	message: string;
}

export interface StudentImportRunResult {
	created: number;
	failed: StudentImportRunFailure[];
	studentIds: string[];
}

export interface StudentImportRunOptions {
	schoolId: string;
	client: SchoolClient;
	rows: readonly ValidatedStudentImportRow[];
	onProgress?: (current: number, total: number) => void;
	seed?: string;
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
	}
	return undefined;
}

function messageFromError(error: unknown): string {
	if (error instanceof ApiError) {
		return messageFromApiError(error) ?? 'La requête a échoué.';
	}
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	return 'La requête a échoué.';
}

export async function runStudentImport(options: StudentImportRunOptions): Promise<StudentImportRunResult> {
	const { schoolId, client, rows, onProgress, seed = Date.now().toString(36) } = options;
	const failed: StudentImportRunFailure[] = [];
	const studentIds: string[] = [];
	const createdAt = new Date().toISOString();
	const total = rows.length;

	for (const [index, row] of rows.entries()) {
		onProgress?.(index, total);
		const { studentId, enrollmentId } = createStudentImportIds(index, seed);

		try {
			await registerAndEnrollStudent(client, {
				schoolId,
				studentId,
				enrollmentId,
				firstName: row.prenom,
				lastName: row.nom,
				classGroupId: row.classGroupId,
				birthDate: row.date_naissance,
				sendAccountInvitation: false,
				createdAt,
			});
			studentIds.push(studentId);
		}
		catch (error) {
			failed.push({
				rowIndex: row.rowIndex,
				studentName: `${row.prenom} ${row.nom}`.trim(),
				message: messageFromError(error),
			});
		}
	}

	onProgress?.(total, total);

	const result = {
		created: studentIds.length,
		failed,
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
