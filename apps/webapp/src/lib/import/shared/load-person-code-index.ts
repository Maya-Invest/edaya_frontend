import type { EntityQuery } from '@maya-invest/edaya-api-client';
import { listAllEntityPages, schoolWideEntityList } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { normalizeImportCode } from '$lib/import/shared/normalize-import-code';

const PERSON_CODE_INDEX_SCOPE
	= 'Import validation loads person codes for duplicate detection and assignment lookup.';

export interface PersonCodeEntry {
	id: string;
	code: string;
}

async function loadPersonCodeIndex(
	list: (query: EntityQuery) => Promise<readonly {
		id?: string | null;
		code?: string | null;
	}[] | null | undefined>,
): Promise<Map<string, PersonCodeEntry>> {
	const entities = await listAllEntityPages(query => list(query), {
		baseQuery: schoolWideEntityList(PERSON_CODE_INDEX_SCOPE),
	});
	const index = new Map<string, PersonCodeEntry>();

	for (const entity of entities) {
		const id = typeof entity.id === 'string' ? entity.id.trim() : '';
		if (!id) {
			continue;
		}
		const code = typeof entity.code === 'string' ? entity.code.trim() : '';
		index.set(normalizeImportCode(id), { id, code: code || id });
		if (code) {
			index.set(normalizeImportCode(code), { id, code });
		}
	}

	return index;
}

export async function loadTeacherCodeIndex(): Promise<Map<string, PersonCodeEntry>> {
	const client = getBrowserSchoolClient();
	return loadPersonCodeIndex(query => client.entities.teachers.list(query));
}

export async function loadStaffCodeIndex(): Promise<Map<string, PersonCodeEntry>> {
	const client = getBrowserSchoolClient();
	return loadPersonCodeIndex(query => client.entities.staffMembers.list(query));
}

export async function loadGuardianCodeIndex(): Promise<Map<string, PersonCodeEntry>> {
	const client = getBrowserSchoolClient();
	return loadPersonCodeIndex(query => client.entities.guardians.list(query));
}

export async function loadPaymentReferenceIndex(): Promise<ReadonlySet<string>> {
	const client = getBrowserSchoolClient();
	const payments = await listAllEntityPages(
		query => client.entities.payments.list(query),
		{ baseQuery: schoolWideEntityList('Import validation loads payment references for duplicate detection.') },
	);
	const index = new Set<string>();
	for (const payment of payments) {
		const reference = typeof payment.reference === 'string' ? payment.reference.trim() : '';
		if (!reference) {
			continue;
		}
		index.add(normalizeImportCode(reference));
	}
	return index;
}
