export type StructureModel = 'college' | 'lycee';

export type GradeLevelTemplateKey
	= | 'gl-6'
		| 'gl-5'
		| 'gl-4'
		| 'gl-3'
		| 'gl-2'
		| 'gl-1'
		| 'gl-t';

export interface GradeLevelTemplate {
	key: GradeLevelTemplateKey;
	name: string;
	shortLabel: string;
	model: StructureModel;
	order: number;
}

export const COLLEGE_GRADE_LEVEL_KEYS: readonly GradeLevelTemplateKey[] = [
	'gl-6',
	'gl-5',
	'gl-4',
	'gl-3',
];

export const LYCEE_GRADE_LEVEL_KEYS: readonly GradeLevelTemplateKey[] = [
	'gl-2',
	'gl-1',
	'gl-t',
];

/** Maps onboarding UI models to API structure template ids (`@edaya/fixtures/onboarding`). */
export const STRUCTURE_MODEL_API_TEMPLATE_IDS = {
	college: 'ci-college',
	lycee: 'ci-lycee',
} as const satisfies Record<StructureModel, string>;

/**
 * Maps simplified grade-level keys to API template grade ids.
 * Lycée rows use one representative track per year (C / générale).
 */
export const GRADE_LEVEL_API_TEMPLATE_IDS = {
	'gl-6': 'ci-college:6EME',
	'gl-5': 'ci-college:5EME',
	'gl-4': 'ci-college:4EME',
	'gl-3': 'ci-college:3EME',
	'gl-2': 'ci-lycee:2NDC',
	'gl-1': 'ci-lycee:1ERC',
	'gl-t': 'ci-lycee:TLEC',
} as const satisfies Record<GradeLevelTemplateKey, string>;

export function toApiStructureTemplateIds(models: readonly StructureModel[]): string[] {
	return models.map(model => STRUCTURE_MODEL_API_TEMPLATE_IDS[model]);
}

export function toApiGradeLevelTemplateId(gradeLevelId: GradeLevelTemplateKey): string {
	return GRADE_LEVEL_API_TEMPLATE_IDS[gradeLevelId];
}

export const GRADE_LEVEL_TEMPLATES: Record<GradeLevelTemplateKey, GradeLevelTemplate> = {
	'gl-6': { key: 'gl-6', name: '6ème', shortLabel: '6e', model: 'college', order: 1 },
	'gl-5': { key: 'gl-5', name: '5ème', shortLabel: '5e', model: 'college', order: 2 },
	'gl-4': { key: 'gl-4', name: '4ème', shortLabel: '4e', model: 'college', order: 3 },
	'gl-3': { key: 'gl-3', name: '3ème', shortLabel: '3e', model: 'college', order: 4 },
	'gl-2': { key: 'gl-2', name: '2nde', shortLabel: '2nde', model: 'lycee', order: 5 },
	'gl-1': { key: 'gl-1', name: '1ère', shortLabel: '1ère', model: 'lycee', order: 6 },
	'gl-t': { key: 'gl-t', name: 'Terminale', shortLabel: 'Terminale', model: 'lycee', order: 7 },
};

const CLASS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;

export function isGradeLevelTemplateKey(value: string): value is GradeLevelTemplateKey {
	return value in GRADE_LEVEL_TEMPLATES;
}

export function templateKeysForModel(model: StructureModel): readonly GradeLevelTemplateKey[] {
	return model === 'college' ? COLLEGE_GRADE_LEVEL_KEYS : LYCEE_GRADE_LEVEL_KEYS;
}

export function classDisplayName(templateKey: GradeLevelTemplateKey, index: number): string {
	const template = GRADE_LEVEL_TEMPLATES[templateKey];
	const letter = CLASS_LETTERS[index] ?? String(index + 1);
	return `${template.shortLabel} ${letter}`;
}

export function previewClassNames(templateKey: GradeLevelTemplateKey, classCount: number): string[] {
	return Array.from({ length: classCount }, (_, index) => classDisplayName(templateKey, index));
}

export function sortedStructureLevels<T extends { gradeLevelId: string }>(levels: T[]): T[] {
	return [...levels].sort((left, right) => {
		const leftOrder = isGradeLevelTemplateKey(left.gradeLevelId)
			? GRADE_LEVEL_TEMPLATES[left.gradeLevelId].order
			: 999;
		const rightOrder = isGradeLevelTemplateKey(right.gradeLevelId)
			? GRADE_LEVEL_TEMPLATES[right.gradeLevelId].order
			: 999;
		return leftOrder - rightOrder;
	});
}
