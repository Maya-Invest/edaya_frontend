import type { components } from '$lib/api/schema';

export type OnboardingDataset = components['schemas']['OnboardingDataset'];
export type DatasetChoice = components['schemas']['OnboardingDatasetChoices']['datasets'][number];
export type DatasetReference = Pick<OnboardingDataset, 'id' | 'version'>;
export type DatasetLevel = OnboardingDataset['templates'][number]['gradeLevels'][number];
export type CatalogSubject = DatasetLevel['subjects'][number] & { matters: string[]; disciplineName: string; categoryName: string };
export type CatalogGradeLevel = DatasetLevel & { templateId: string; templateLabel: string };
export interface DatasetCatalog {
	dataset: OnboardingDataset;
	gradeLevels: CatalogGradeLevel[];
	byId: Map<string, CatalogGradeLevel>;
	subjectsByGradeLevelId: Map<string, CatalogSubject[]>;
}
export function buildDatasetCatalog(dataset: OnboardingDataset): DatasetCatalog {
	const gradeLevels = dataset.templates.flatMap(template => [...template.gradeLevels].sort((a, b) => a.order - b.order).map(level => ({ ...level, templateId: template.id, templateLabel: template.label })));
	return {
		dataset,
		gradeLevels,
		byId: new Map(gradeLevels.map(level => [level.id, level])),
		subjectsByGradeLevelId: new Map(gradeLevels.map(level => [level.id, level.subjects.map(subject => ({
			...subject,
			matters: [...subject.chapters].sort((a, b) => a.order - b.order).map(chapter => chapter.title),
			disciplineName: dataset.disciplines.find(row => row.code === subject.disciplineCode)!.name,
			categoryName: dataset.subjectCategories.find(row => row.code === subject.categoryCode)!.name,
		}))])),
	};
}
export function sameDataset(left: DatasetReference | null | undefined, right: DatasetReference | null | undefined): boolean {
	return Boolean(left && right && left.id === right.id && left.version === right.version);
}
export function gradeLevelsForTemplates(catalog: DatasetCatalog, templates: readonly string[]): CatalogGradeLevel[] {
	return catalog.gradeLevels.filter(level => templates.includes(level.templateId));
}
export function getCatalogGradeLevel(catalog: DatasetCatalog, id: string): CatalogGradeLevel | undefined {
	return catalog.byId.get(id);
}
