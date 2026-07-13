import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ValidatedStaffImportRow } from './types';
import { t } from '$lib/i18n';
import { formatImportRunErrorMessage } from '$lib/import/shared/format-import-run-error';
import { createStaffImportIds, registerStaffMember } from '$lib/staff/register-staff-member';
import { notifyStaffListChanged } from '$lib/staff/notify-staff-list-changed';
import { get } from 'svelte/store';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface StaffImportRunFailure {
	rowIndex: number;
	staffName: string;
	message: string;
}

export interface StaffImportRunResult {
	created: number;
	failed: StaffImportRunFailure[];
	staffIds: string[];
}

export interface StaffImportRunOptions {
	schoolId: string;
	client: SchoolClient;
	rows: readonly ValidatedStaffImportRow[];
	onProgress?: (current: number, total: number) => void;
	seed?: string;
}

export async function runStaffImport(options: StaffImportRunOptions): Promise<StaffImportRunResult> {
	const { schoolId, client, rows, onProgress, seed = Date.now().toString(36) } = options;
	const failed: StaffImportRunFailure[] = [];
	const staffIds: string[] = [];
	const createdAt = new Date().toISOString();
	const total = rows.length;

	for (const [index, row] of rows.entries()) {
		onProgress?.(index, total);
		const { staffId } = createStaffImportIds(index, seed);

		try {
			await registerStaffMember(client, {
				schoolId,
				staffId,
				firstName: row.prenom,
				lastName: row.nom,
				email: row.email,
				sendAccountInvitation: false,
				createdAt,
			});
			staffIds.push(staffId);
		}
		catch (error) {
			failed.push({
				rowIndex: row.rowIndex,
				staffName: `${row.prenom} ${row.nom}`.trim(),
				message: formatImportRunErrorMessage(error, {
					entityLabel: row.role,
				}, (key, params) => get(t)(key, params ?? {})),
			});
		}
	}

	onProgress?.(total, total);

	const result = {
		created: staffIds.length,
		failed,
		staffIds,
	};

	if (staffIds.length > 0) {
		try {
			notifyStaffListChanged();
		}
		catch {
			// Import succeeded; roster notification is best-effort.
		}
	}

	return result;
}
