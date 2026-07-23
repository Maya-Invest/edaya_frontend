import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ValidatedGuardianImportRow } from './types';
import { notifyGuardiansListChanged } from '$lib/guardians/notify-guardians-list-changed';
import {
	createGuardianImportIds,
	createGuardianStudentLinkId,
	linkGuardianToStudent,
	registerGuardian,
} from '$lib/guardians/register-and-link-guardian';
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
	linksCreated: number;
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
	let linksCreated = 0;

	for (const [index, row] of rows.entries()) {
		onProgress?.(index, total);
		const firstStudentId = row.studentIds[0] ?? '';
		const { guardianId } = createGuardianImportIds(index, firstStudentId, seed);
		let guardianRegistered = false;
		let rowLinksCreated = 0;

		try {
			await registerGuardian(client, {
				schoolId,
				guardianId,
				firstName: row.prenom,
				lastName: row.nom,
				code: row.code,
				email: row.email,
				phone: row.telephone,
				sendAccountInvitation: false,
				createdAt,
			});
			guardianRegistered = true;
		}
		catch (error) {
			failed.push({
				rowIndex: row.rowIndex,
				guardianName: `${row.prenom} ${row.nom}`.trim(),
				message: formatImportRunErrorMessage(error, {
					entityLabel: row.eleve_matricule,
				}, (key, params) => get(t)(key, params ?? {})),
			});
			continue;
		}

		for (const studentId of row.studentIds) {
			try {
				await linkGuardianToStudent(client, {
					linkId: createGuardianStudentLinkId(guardianId, studentId),
					guardianId,
					studentId,
					createdAt,
				});
				rowLinksCreated += 1;
				linksCreated += 1;
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

		if (guardianRegistered && rowLinksCreated > 0) {
			guardianIds.push(guardianId);
		}
	}

	onProgress?.(total, total);

	const result = {
		created: guardianIds.length,
		linksCreated,
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
