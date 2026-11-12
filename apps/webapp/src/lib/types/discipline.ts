export type DisciplinaryActionKind = 'sanction' | 'reward';

export interface DisciplinaryActionCatalogItem {
	shortName?: string;
	id: string;
	schoolId: string;
	name: string;
	kind: DisciplinaryActionKind;
	severity?: number;
	defaultDurationDays?: number;
	description?: string;
}
