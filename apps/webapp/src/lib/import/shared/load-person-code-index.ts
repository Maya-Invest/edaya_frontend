import { schoolWideEntityList } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { normalizeImportCode } from '$lib/import/shared/normalize-import-code';

const PERSON_CODE_INDEX_SCOPE
	= 'Import validation loads person codes for duplicate detection and assignment lookup.';

export interface PersonCodeEntry {
	id: string;
	code: string;
}

async function loadPersonCodeIndex(
	list: () => Promise<readonly { id?: string | null }[] | null | undefined>,
): Promise<Map<string, PersonCodeEntry>> {
	const entities = await list();
	const index = new Map<string, PersonCodeEntry>();

	for (const entity of entities ?? []) {
		// Person entities no longer expose a separate `code`; import codes are the entity id.
		const id = typeof entity.id === 'string' ? entity.id.trim() : '';
		if (!id) {
			continue;
		}
		index.set(normalizeImportCode(id), { id, code: id });
	}

	return index;
}

export async function loadTeacherCodeIndex(): Promise<Map<string, PersonCodeEntry>> {
	const client = getBrowserSchoolClient();
	return loadPersonCodeIndex(() =>
		client.entities.teachers.list(schoolWideEntityList(PERSON_CODE_INDEX_SCOPE)),
	);
}

export async function loadStaffCodeIndex(): Promise<Map<string, PersonCodeEntry>> {
	const client = getBrowserSchoolClient();
	return loadPersonCodeIndex(() =>
		client.entities.staffMembers.list(schoolWideEntityList(PERSON_CODE_INDEX_SCOPE)),
	);
}

export async function loadGuardianCodeIndex(): Promise<Map<string, PersonCodeEntry>> {
	const client = getBrowserSchoolClient();
	return loadPersonCodeIndex(() =>
		client.entities.guardians.list(schoolWideEntityList(PERSON_CODE_INDEX_SCOPE)),
	);
}

export async function loadPaymentReferenceIndex(): Promise<ReadonlySet<string>> {
	const client = getBrowserSchoolClient();
	const payments = await client.entities.payments.list(
		schoolWideEntityList('Import validation loads payment references for duplicate detection.'),
	);
	const index = new Set<string>();
	for (const payment of payments ?? []) {
		const reference = typeof payment.reference === 'string' ? payment.reference.trim() : '';
		if (!reference) {
			continue;
		}
		index.add(normalizeImportCode(reference));
	}
	return index;
}
