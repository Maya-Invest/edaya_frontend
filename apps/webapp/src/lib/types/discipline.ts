export type DisciplinaryActionKind = 'sanction' | 'reward';

export interface DisciplinaryActionCatalogItem {
	id: string;
	schoolId: string;
	name: string;
	kind: DisciplinaryActionKind;
	severity?: number;
	defaultDurationDays?: number;
	description?: string;
}
