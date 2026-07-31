export type StructureModel = 'college' | 'lycee';

/** Maps onboarding UI models to API structure template ids (`@edaya/fixtures/onboarding`). */
export const STRUCTURE_MODEL_API_TEMPLATE_IDS = {
	college: 'ci-college',
	lycee: 'ci-lycee',
} as const satisfies Record<StructureModel, string>;

export function isStructureModel(value: string): value is StructureModel {
	return value === 'college' || value === 'lycee';
}

export function toApiStructureTemplateIds(models: readonly StructureModel[]): string[] {
	return models.map(model => STRUCTURE_MODEL_API_TEMPLATE_IDS[model]);
}
