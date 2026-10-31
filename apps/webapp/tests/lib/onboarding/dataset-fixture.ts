import type { DatasetLevel, OnboardingDataset } from '$lib/onboarding/dataset-model';
import { buildDatasetCatalog } from '$lib/onboarding/dataset-model';
import { createEmptyDraft } from '$lib/onboarding/draft-storage';

const level = (template: string, code: string, shortLabel: string, order: number): DatasetLevel => ({
 id: `${template}:${code}`, code, name: shortLabel, shortLabel, order,
 reportModules: [{ code: 'LETTERS', name: 'Bilan Lettre', order: 1, weightingMode: 'subject_coefficients' }, { code: 'SCIENCE', name: 'Bilan Science', order: 2, weightingMode: 'subject_coefficients' }],
 gradingPolicy: { gradeScaleCode: 'NUMERIC_20', mode: 'numeric-first', aggregateLabel: 'Moyenne générale', passThreshold: 10 },
 subjects: [
 { code: 'FR', name: 'Français', shortName: 'Français', disciplineCode: 'FR', categoryCode: 'LANGUAGES', coefficient: 3, isOptional: false, reportModuleCode: 'LETTERS', reportOrder: 1, chapters: ['Lecture', 'Grammaire', 'Conjugaison', 'Expression écrite'].map((title, i) => ({code: `CH${i}`, title, order: i + 1})) },
 { code: 'MATH', name: 'Mathématiques', shortName: 'Mathématiques', disciplineCode: 'MATH', categoryCode: 'SCIENCE', coefficient: 3, isOptional: true, reportModuleCode: 'SCIENCE', reportOrder: 2, chapters: ['Nombres', 'Fractions', 'Géométrie'].map((title, i) => ({code: `CH${i}`, title, order: i + 1})) },
 ],
});
export const dataset: OnboardingDataset = {
 id: 'ci-general-secondary', version: '1.0.0', schemaVersion: 1, countryCode: 'CI',
 disciplines: [{code: 'FR', name: 'Français'}, {code: 'MATH', name: 'Mathématiques'}],
 subjectCategories: [{code: 'LANGUAGES', name: 'Langues'}, {code: 'SCIENCE', name: 'Scientifique'}],
 gradeScales: [{ code: 'NUMERIC_20', name: 'Sur 20', minScore: 0, maxScore: 20, decimalPlaces: 2, roundingMode: 'nearest', intervalConvention: 'continuous', ranges: [
 ['TF', 0, 4, 'Très-faible'], ['F', 4, 6, 'Faible'], ['TI', 6, 8, 'Très-insuffisant'], ['I', 8, 10, 'Insuffisant'], ['P', 10, 12, 'Passable'], ['AB', 12, 14, 'Assez-Bien'], ['B', 14, 16, 'Bien'], ['TB', 16, 18, 'Très-Bien'], ['EX', 18, 20, 'Excellent'],
 ].map(([code, minScore, maxScore, label]) => ({code: code as string, minScore: minScore as number, maxScore: maxScore as number, label: label as string})) }],
 calendarProfiles: [{ code: 'TRIMESTERS', periodType: 'trimester', periods: [1, 2, 3].map(n => ({code: `T${n}`, name: `Trimestre ${n}`, weight: 1})) }],
 templates: [
 {id: 'ci-college', label: 'Collège', description: 'Collège', cycle: 'Collège', calendarProfileCode: 'TRIMESTERS', reportPresentation: {includeSummary: false, includeComments: true}, gradeLevels: ['6', '5', '4', '3'].map((n, i) => level('ci-college', `${n}EME`, `${n}ème`, i + 1))},
 {id: 'ci-lycee', label: 'Lycée', description: 'Lycée', cycle: 'Lycée', calendarProfileCode: 'TRIMESTERS', reportPresentation: {includeSummary: false, includeComments: true}, gradeLevels: [['2NDA', '2nde A'], ['2NDC', '2nde C'], ['1ERA', '1ère A'], ['1ERC', '1ère C'], ['1ERD', '1ère D'], ['TLEA', 'Tle A'], ['TLEC', 'Tle C'], ['TLED', 'Tle D']].map(([code, label], i) => level('ci-lycee', code!, label!, i + 1))},
 ],
};
export const reference = {id: dataset.id, version: dataset.version};
export const catalog = buildDatasetCatalog(dataset);
export function createDatasetDraft() {
 const draft = createEmptyDraft();
 draft.structure.dataset = {...reference};
 return draft;
}
