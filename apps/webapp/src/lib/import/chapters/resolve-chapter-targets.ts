import type {
	ChapterImportCatalogTarget,
	ChapterImportValidationContext,
} from './types';
import {
	buildImportGradeLevelLookup,
	resolveImportGradeLevel,
} from '$lib/import/shared/resolve-import-grade-level';
import { normalizeSubjectLookupName } from '$lib/import/teachers/subject-name-lookup';

export function resolveChapterImportTarget(
	niveau: string,
	matiere: string,
	context: ChapterImportValidationContext,
	subjectId?: string,
): {
	target?: ChapterImportCatalogTarget;
	suggestions: string[];
	levelSuggestions?: string[];
	ambiguous?: boolean;
} {
	const gradeLevelLookup = buildImportGradeLevelLookup(
		[...new Map(context.catalogTargets.map(entry => [entry.gradeLevelId, {
			id: entry.gradeLevelId,
			name: entry.gradeLevelName,
		}])).values()],
	);

	const gradeLevels = [...gradeLevelLookup.values()].flat();
	const levelResolution = resolveImportGradeLevel(niveau, gradeLevelLookup, gradeLevels);

	if (!levelResolution.gradeLevelId) {
		return {
			suggestions: [],
			levelSuggestions: levelResolution.suggestions,
		};
	}

	const normalizedSubject = normalizeSubjectLookupName(matiere);
	const matches = context.catalogTargets.filter(entry => entry.gradeLevelId === levelResolution.gradeLevelId
		&& (subjectId?.trim() ? entry.subjectId === subjectId.trim() : normalizeSubjectLookupName(entry.subjectName) === normalizedSubject));
	if (matches.length === 1)
		return { target: matches[0], suggestions: [] };
	if (matches.length > 1)
		return { ambiguous: true, suggestions: matches.map(entry => entry.subjectId) };

	const uniqueNames = [...new Set(
		context.catalogTargets
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
		suggestions: suggestions.length > 0 ? suggestions : uniqueNames.slice(0, 5),
	};
}
