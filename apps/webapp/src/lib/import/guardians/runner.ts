import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ValidatedGuardianImportRow } from './types';
import { notifyGuardiansListChanged } from '$lib/guardians/notify-guardians-list-changed';
import { createGuardianImportIds, registerAndLinkGuardian } from '$lib/guardians/register-and-link-guardian';
import { t } from '$lib/i18n';
import { formatImportRunErrorMessage } from '$lib/import/shared/format-import-run-error';
import { get } from 'svelte/store';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface GuardianImportRunFailure {
	rowIndex: number;
	guardianName: string;
	message: string;
}

export interface GuardianImportRunResult {
	created: number;
	failed: GuardianImportRunFailure[];
	guardianIds: string[];
}

export interface GuardianImportRunOptions {
	schoolId: string;
	client: SchoolClient;
	rows: readonly ValidatedGuardianImportRow[];
	onProgress?: (current: number, total: number) => void;
	seed?: string;
}

export async function runGuardianImport(options: GuardianImportRunOptions): Promise<GuardianImportRunResult> {
	const { schoolId, client, rows, onProgress, seed = Date.now().toString(36) } = options;
	const failed: GuardianImportRunFailure[] = [];
	const guardianIds: string[] = [];
	const createdAt = new Date().toISOString();
	const total = rows.length;

	for (const [index, row] of rows.entries()) {
		onProgress?.(index, total);
		const { guardianId, linkId } = createGuardianImportIds(index, row.studentId, seed);

		try {
			await registerAndLinkGuardian(client, {
				schoolId,
				guardianId,
				linkId,
				studentId: row.studentId,
				firstName: row.prenom,
				lastName: row.nom,
				email: row.email,
				phone: row.telephone,
				sendAccountInvitation: false,
				createdAt,
			});
			guardianIds.push(guardianId);
		}
		catch (error) {
			failed.push({
				rowIndex: row.rowIndex,
				guardianName: `${row.prenom} ${row.nom}`.trim(),
				message: formatImportRunErrorMessage(error, {
					entityLabel: row.eleve_matricule,
				}, (key, params) => get(t)(key, params ?? {})),
			});
		}
	}

	onProgress?.(total, total);

	const result = {
		created: guardianIds.length,
		failed,
		guardianIds,
	};

	if (guardianIds.length > 0) {
		try {
			notifyGuardiansListChanged();
		}
		catch {
			// Import succeeded; roster notification is best-effort.
		}
	}

	return result;
}
