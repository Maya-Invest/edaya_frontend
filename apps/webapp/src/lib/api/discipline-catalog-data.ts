import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { DisciplinaryActionCatalogItem } from '$lib/types/discipline';
import { schoolWideEntityList } from '$lib/api/entity-list-filters';

type DisciplinaryActionRaw = components['schemas']['DisciplinaryAction'];

const DISCIPLINE_CATALOG_SCOPE
	= 'Disciplinary catalog screen intentionally loads the school-wide action catalog.';

function mapDisciplinaryAction(raw: DisciplinaryActionRaw): DisciplinaryActionCatalogItem {
	return {
		id: raw.id,
		schoolId: raw.schoolId,
		name: raw.name,
		kind: raw.kind,
		severity: raw.severity ?? undefined,
		defaultDurationDays: raw.defaultDurationDays ?? undefined,
		description: raw.description ?? undefined,
	};
}

export async function loadDisciplineCatalogData(
	client: ReturnType<typeof getBrowserSchoolClient>,
	schoolId: string,
): Promise<{
	actions: DisciplinaryActionCatalogItem[];
}> {
	const rows = await client.entities.disciplinaryActions.list({
		...schoolWideEntityList(DISCIPLINE_CATALOG_SCOPE),
		schoolId,
	});
	return {
		actions: (rows ?? []).map(mapDisciplinaryAction),
	};
}