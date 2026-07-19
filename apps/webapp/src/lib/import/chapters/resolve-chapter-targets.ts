import type {

	ChapterImportClassSubjectTarget,

	ChapterImportValidationContext,

} from './types';

import { normalizeSubjectLookupName } from '$lib/import/teachers/subject-name-lookup';

import {

	buildImportGradeLevelLookup,

	resolveImportGradeLevel,

} from '$lib/import/shared/resolve-import-grade-level';



function normalizeLookupValue(value: string): string {

	return value.trim().toLowerCase();

}



export function resolveChapterImportTargets(

	niveau: string,

	matiere: string,

	context: ChapterImportValidationContext,

): {

	targets: ChapterImportClassSubjectTarget[];

	suggestions: string[];

	levelSuggestions?: string[];

} {

	const gradeLevelLookup = buildImportGradeLevelLookup(

		[...new Map(context.classSubjects.map(entry => [entry.gradeLevelId, {

			id: entry.gradeLevelId,

			name: entry.gradeLevelName,

		}])).values()],

	);

	const gradeLevels = [...gradeLevelLookup.values()].flat();

	const levelResolution = resolveImportGradeLevel(niveau, gradeLevelLookup, gradeLevels);

	if (!levelResolution.gradeLevelId) {

		return {

			targets: [],

			suggestions: [],

			levelSuggestions: levelResolution.suggestions,

		};

	}



	const normalizedSubject = normalizeSubjectLookupName(matiere);

	const matches = context.classSubjects.filter(

		entry => entry.gradeLevelId === levelResolution.gradeLevelId

			&& normalizeSubjectLookupName(entry.subjectName) === normalizedSubject,

	);



	if (matches.length > 0) {

		return { targets: matches, suggestions: [] };

	}



	const uniqueNames = [...new Set(

		context.classSubjects

			.filter(entry => entry.gradeLevelId === levelResolution.gradeLevelId)

			.map(entry => entry.subjectName),

	)];

	const suggestions = uniqueNames

		.filter((name) => {

			const normalizedName = normalizeSubjectLookupName(name);

			return normalizedName.includes(normalizedSubject)

				|| normalizedSubject.includes(normalizedName);

		})

		.slice(0, 5);



	return {

		targets: [],

		suggestions: suggestions.length > 0 ? suggestions : uniqueNames.slice(0, 5),

	};

}



export function uniqueChapterSubjectNames(

	targets: readonly ChapterImportClassSubjectTarget[],

): string[] {

	return [...new Set(targets.map(entry => entry.subjectName))].sort((left, right) =>

		left.localeCompare(right, 'fr'),

	);

}



export function uniqueChapterGradeLevelNames(

	targets: readonly ChapterImportClassSubjectTarget[],

): string[] {

	return [...new Set(targets.map(entry => entry.gradeLevelName))].sort((left, right) =>

		left.localeCompare(right, 'fr'),

	);

}

