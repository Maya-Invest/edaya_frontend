import type { CatalogLang } from '$lib/i18n/catalog-label';
import type {
	AcademicPeriod,
	CatalogChapter,
	ClassNode,
	GradeLevel,
	PeriodDefinition,
	Subject,
} from '$lib/types/school';
import {
	catalogCategory,
	catalogClassName,
	catalogCycle,
	catalogGradeName,
	catalogGradeShortLabel,
	catalogMatter,
	catalogPeriodLabel,
	catalogSlotLabel,
	catalogSubjectName,
} from '$lib/i18n/catalog-label';

export function localizeGradeLevel(level: GradeLevel, lang: CatalogLang): GradeLevel {
	return {
		...level,
		name: catalogGradeName(level.name, lang),
		label: catalogGradeShortLabel(level.label, lang),
		cycle: catalogCycle(level.cycle, lang),
	};
}

export function localizeClassNode(node: ClassNode, lang: CatalogLang): ClassNode {
	return {
		...node,
		name: catalogClassName(node.name, lang),
		level: catalogCycle(node.level, lang),
	};
}

export function localizeAcademicPeriod(period: AcademicPeriod, lang: CatalogLang): AcademicPeriod {
	return {
		...period,
		label: catalogPeriodLabel(period.label, lang),
	};
}

export function localizePeriodDefinition(
	definition: PeriodDefinition,
	lang: CatalogLang,
): PeriodDefinition {
	return {
		...definition,
		label: catalogSlotLabel(definition.label, lang),
	};
}

export function localizeCatalogChapter(chapter: CatalogChapter, lang: CatalogLang): CatalogChapter {
	return {
		...chapter,
		name: catalogMatter(chapter.name, lang),
	};
}

export function localizeSubject(subject: Subject, lang: CatalogLang): Subject {
	return {
		...subject,
		name: catalogSubjectName(subject.name, lang, subject.code),
		category: catalogCategory(subject.category, lang) as Subject['category'],
		catalogChapters: subject.catalogChapters?.map(chapter => localizeCatalogChapter(chapter, lang)),
	};
}
