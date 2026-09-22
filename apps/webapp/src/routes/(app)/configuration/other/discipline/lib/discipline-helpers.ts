import type { DisciplinaryActionCatalogItem } from '$lib/types/discipline';

export interface DisciplinePageSlice {
	actions: DisciplinaryActionCatalogItem[];
}

export function emptyDisciplineSlice(): DisciplinePageSlice {
	return {
		actions: [],
	};
}
