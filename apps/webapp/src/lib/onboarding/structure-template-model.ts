import type { components } from '$lib/api/schema';
import type { StructureModel } from '$lib/onboarding/structure-templates';
import { STRUCTURE_MODEL_API_TEMPLATE_IDS } from '$lib/onboarding/structure-templates';

export type OnboardingListStructureTemplatesResponse
	= components['schemas']['OnboardingListStructureTemplatesResponse'];

export type StructureTemplateDefinition
	= components['schemas']['StructureTemplateDefinition'];

export interface CatalogSubject {
	code: string;
	name: string;
	matters: string[];
}

export interface CatalogGradeLevel {
	id: string;
	code: string;
	name: string;
	shortLabel: string;
	order: number;
	model: StructureModel;
}

export interface StructureTemplateCatalog {
	countryCode: OnboardingListStructureTemplatesResponse['countryCode'];
	gradeLevels: CatalogGradeLevel[];
	byId: Map<string, CatalogGradeLevel>;
	subjectsByGradeLevelId: Map<string, CatalogSubject[]>;
}

const API_TEMPLATE_ID_TO_MODEL = Object.fromEntries(
	Object.entries(STRUCTURE_MODEL_API_TEMPLATE_IDS).map(([model, templateId]) => [templateId, model]),
) as Record<string, StructureModel>;

export function buildCatalogFromTemplates(
	templates: readonly StructureTemplateDefinition[],
	countryCode: OnboardingListStructureTemplatesResponse['countryCode'] = 'CI',
): StructureTemplateCatalog {
	const gradeLevels: CatalogGradeLevel[] = [];
	const subjectsByGradeLevelId = new Map<string, CatalogSubject[]>();

	for (const template of templates) {
		const model = API_TEMPLATE_ID_TO_MODEL[template.id];
		if (!model) {
			continue;
		}

		const subjectNameByCode = new Map(
			template.subjects.map(subject => [subject.code, subject.shortName || subject.code]),
		);

		for (const level of template.gradeLevels) {
			gradeLevels.push({
				id: level.id,
				code: level.code,
				name: level.name,
				shortLabel: level.shortLabel || level.code,
				order: level.order,
				model,
			});

			const levelSubjects: CatalogSubject[] = [];
			const seenCodes = new Set<string>();
			for (const entry of template.curriculum) {
				if (entry.levelCode !== level.code || seenCodes.has(entry.subjectCode)) {
					continue;
				}
				seenCodes.add(entry.subjectCode);
				levelSubjects.push({
					code: entry.subjectCode,
					name: subjectNameByCode.get(entry.subjectCode) ?? entry.subjectCode,
					matters: Array.isArray(entry.matters) ? [...entry.matters] : [],
				});
			}
			subjectsByGradeLevelId.set(level.id, levelSubjects);
		}
	}

	gradeLevels.sort((left, right) => {
		if (left.model !== right.model) {
			return left.model === 'college' ? -1 : 1;
		}
		return left.order - right.order;
	});

	return {
		countryCode,
		gradeLevels,
		byId: new Map(gradeLevels.map(level => [level.id, level])),
		subjectsByGradeLevelId,
	};
}

export function gradeLevelsForModels(
	catalog: StructureTemplateCatalog,
	models: readonly StructureModel[],
): CatalogGradeLevel[] {
	const selected = new Set(models);
	return catalog.gradeLevels.filter(level => selected.has(level.model));
}

export function getCatalogGradeLevel(
	catalog: StructureTemplateCatalog,
	id: string,
): CatalogGradeLevel | undefined {
	return catalog.byId.get(id);
}

/** Unique subjects (by code) across the given grade-level ids. */
export function subjectsForGradeLevelIds(
	catalog: StructureTemplateCatalog,
	gradeLevelIds: readonly string[],
): CatalogSubject[] {
	const byCode = new Map<string, CatalogSubject>();
	for (const gradeLevelId of gradeLevelIds) {
		const subjects = catalog.subjectsByGradeLevelId.get(gradeLevelId) ?? [];
		for (const subject of subjects) {
			if (!byCode.has(subject.code)) {
				byCode.set(subject.code, subject);
			}
		}
	}
	return [...byCode.values()].sort((left, right) => left.code.localeCompare(right.code));
}
