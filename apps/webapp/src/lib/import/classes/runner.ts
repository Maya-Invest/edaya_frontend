import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ValidatedClassImportRow } from './types';
import { t } from '$lib/i18n';
import { formatImportRunErrorMessage } from '$lib/import/shared/format-import-run-error';
import { get } from 'svelte/store';
import { nextClassIdForImport } from './next-class-id';
import { notifyClassesListChanged } from './notify-classes-list-changed';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface ClassImportRunFailure {
	rowIndex: number;
	className: string;
	message: string;
}

export interface ClassImportRunResult {
	created: number;
	failed: ClassImportRunFailure[];
	classIds: string[];
}

export interface ClassImportRunOptions {
	schoolId: string;
	academicYearId: string;
	client: SchoolClient;
	rows: readonly ValidatedClassImportRow[];
	existingClassIds: readonly string[];
	siblingCountByGrade: Readonly<Record<string, number>>;
	onProgress?: (current: number, total: number) => void;
}

export async function runClassImport(options: ClassImportRunOptions): Promise<ClassImportRunResult> {
	const {
		schoolId,
		academicYearId,
		client,
		rows,
		existingClassIds,
		siblingCountByGrade,
		onProgress,
	} = options;

	const failed: ClassImportRunFailure[] = [];
	const classIds: string[] = [];
	const usedClassIds = new Set(existingClassIds);
	const gradeSiblingCounts = new Map(Object.entries(siblingCountByGrade));
	const total = rows.length;

	for (const [index, row] of rows.entries()) {
		onProgress?.(index, total);
		const id = nextClassIdForImport(row.gradeLevelId, usedClassIds, gradeSiblingCounts);

		try {
			await client.commands.createClassGroup({
				id,
				schoolId,
				academicYearId,
				gradeLevelId: row.gradeLevelId,
				name: row.nom.trim(),
				capacity: row.capacity ?? null,
				attendanceMode: 'session',
				homeroomStaffId: null,
			});
			usedClassIds.add(id);
			classIds.push(id);
		}
		catch (error) {
			failed.push({
				rowIndex: row.rowIndex,
				className: row.nom.trim(),
				message: formatImportRunErrorMessage(error, {
					entityLabel: row.nom,
				}, (key, params) => get(t)(key, params ?? {})),
			});
		}
	}

	onProgress?.(total, total);

	const result = {
		created: classIds.length,
		failed,
		classIds,
	};

	if (classIds.length > 0) {
		await notifyClassesListChanged();
	}

	return result;
}
