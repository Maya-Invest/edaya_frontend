import type { Lang } from '$lib/i18n/dictionaries';
import { CI_GRADES } from './catalog/ci-grades';
import {
	CI_BULLETIN_SECTIONS,
	CI_CYCLES,
	CI_DOCUMENT_LABELS,
	CI_DOMAINS,
	CI_EXAMS,
	CI_SLOT_LABELS,
	CI_SUBJECT_CATEGORIES,
} from './catalog/ci-labels';
import { CI_MATTERS } from './catalog/ci-matters';
import { CI_SUBJECTS, type CatalogNamePair } from './catalog/ci-subjects';

export type CatalogLang = Lang;

const TRIMESTRE_FR = /^Trimestre\s+(\d+)$/i;
const TRIMESTRE_EN = /^Term\s+(\d+)$/i;
const SEMESTRE_FR = /^Semestre\s+(\d+)$/i;
const SEMESTRE_EN = /^Semester\s+(\d+)$/i;
const SLOT_PERIOD_FR = /^Période\s+(\d+)$/i;
const SLOT_PERIOD_EN = /^Period\s+(\d+)$/i;

const SUBJECT_BY_FR = new Map(
	Object.values(CI_SUBJECTS).map(pair => [pair.fr, pair]),
);
const SUBJECT_BY_EN = new Map(
	Object.values(CI_SUBJECTS).map(pair => [pair.en, pair]),
);
const GRADE_BY_NAME_FR = new Map(
	Object.values(CI_GRADES).map(grade => [grade.name.fr, grade]),
);
const GRADE_SHORTS = Object.values(CI_GRADES)
	.map(grade => grade.shortLabel)
	.sort((left, right) => right.fr.length - left.fr.length);

const PAIR_TABLES: Array<Record<string, CatalogNamePair>> = [
	CI_DOMAINS,
	CI_SUBJECT_CATEGORIES,
	CI_CYCLES,
	CI_BULLETIN_SECTIONS,
	CI_EXAMS,
	CI_SLOT_LABELS,
	CI_DOCUMENT_LABELS,
];

const EN_TO_FR = new Map<string, string>();

function registerPair(pair: CatalogNamePair) {
	if (pair.en !== pair.fr) {
		EN_TO_FR.set(pair.en, pair.fr);
	}
}

for (const pair of Object.values(CI_SUBJECTS)) {
	registerPair(pair);
}
for (const grade of Object.values(CI_GRADES)) {
	registerPair(grade.name);
	registerPair(grade.shortLabel);
}
for (const table of PAIR_TABLES) {
	for (const pair of Object.values(table)) {
		registerPair(pair);
	}
}
for (const [fr, en] of Object.entries(CI_MATTERS)) {
	if (en !== fr) {
		EN_TO_FR.set(en, fr);
	}
}

function pickPair(pair: CatalogNamePair | undefined, stored: string, lang: CatalogLang): string {
	if (!pair) {
		return stored;
	}
	const trimmed = stored.trim();
	if (!trimmed) {
		return stored;
	}
	if (trimmed !== pair.fr && trimmed !== pair.en) {
		return stored;
	}
	return lang === 'en' ? pair.en : pair.fr;
}

export function catalogSubjectName(
	stored: string,
	lang: CatalogLang,
	code?: string | null,
): string {
	if (code) {
		const byCode = CI_SUBJECTS[code];
		if (byCode) {
			return pickPair(byCode, stored, lang);
		}
	}
	const trimmed = stored.trim();
	return pickPair(SUBJECT_BY_FR.get(trimmed) ?? SUBJECT_BY_EN.get(trimmed), stored, lang);
}

export function catalogGradeName(
	stored: string,
	lang: CatalogLang,
	code?: string | null,
): string {
	if (code) {
		const byCode = CI_GRADES[code];
		if (byCode) {
			return pickPair(byCode.name, stored, lang);
		}
	}
	const trimmed = stored.trim();
	const byName = GRADE_BY_NAME_FR.get(trimmed)
		?? Object.values(CI_GRADES).find(grade => grade.name.en === trimmed);
	return pickPair(byName?.name, stored, lang);
}

export function catalogGradeShortLabel(
	stored: string,
	lang: CatalogLang,
	code?: string | null,
): string {
	if (code) {
		const byCode = CI_GRADES[code];
		if (byCode) {
			return pickPair(byCode.shortLabel, stored, lang);
		}
	}
	const trimmed = stored.trim();
	const match = GRADE_SHORTS.find(pair => pair.fr === trimmed || pair.en === trimmed);
	return pickPair(match, stored, lang);
}

export function catalogClassName(stored: string, lang: CatalogLang): string {
	const trimmed = stored.trim();
	for (const short of GRADE_SHORTS) {
		for (const stem of [short.fr, short.en]) {
			if (trimmed === stem) {
				return lang === 'en' ? short.en : short.fr;
			}
			if (trimmed.startsWith(`${stem} `)) {
				const rest = trimmed.slice(stem.length);
				return `${lang === 'en' ? short.en : short.fr}${rest}`;
			}
		}
	}
	return stored;
}

export function catalogMatter(stored: string, lang: CatalogLang): string {
	const trimmed = stored.trim();
	if (!trimmed) {
		return stored;
	}
	const en = CI_MATTERS[trimmed];
	if (en) {
		return lang === 'en' ? en : trimmed;
	}
	const fr = EN_TO_FR.get(trimmed);
	if (fr && CI_MATTERS[fr]) {
		return lang === 'en' ? CI_MATTERS[fr]! : fr;
	}
	return stored;
}

export function catalogPeriodLabel(stored: string, lang: CatalogLang): string {
	const trimmed = stored.trim();
	const trimester = trimmed.match(TRIMESTRE_FR) ?? trimmed.match(TRIMESTRE_EN);
	if (trimester) {
		return lang === 'en' ? `Term ${trimester[1]}` : `Trimestre ${trimester[1]}`;
	}
	const semester = trimmed.match(SEMESTRE_FR) ?? trimmed.match(SEMESTRE_EN);
	if (semester) {
		return lang === 'en' ? `Semester ${semester[1]}` : `Semestre ${semester[1]}`;
	}
	return stored;
}

export function catalogSlotLabel(stored: string, lang: CatalogLang): string {
	const trimmed = stored.trim();
	const period = trimmed.match(SLOT_PERIOD_FR) ?? trimmed.match(SLOT_PERIOD_EN);
	if (period) {
		return lang === 'en' ? `Period ${period[1]}` : `Période ${period[1]}`;
	}
	const pair = CI_SLOT_LABELS[trimmed]
		?? Object.values(CI_SLOT_LABELS).find(entry => entry.fr === trimmed || entry.en === trimmed);
	return pickPair(pair, stored, lang);
}

export function catalogDomain(stored: string, lang: CatalogLang): string {
	const trimmed = stored.trim();
	const pair = CI_DOMAINS[trimmed]
		?? Object.values(CI_DOMAINS).find(entry => entry.fr === trimmed || entry.en === trimmed);
	return pickPair(pair, stored, lang);
}

export function catalogCycle(stored: string, lang: CatalogLang): string {
	const trimmed = stored.trim();
	const pair = CI_CYCLES[trimmed]
		?? Object.values(CI_CYCLES).find(entry => entry.fr === trimmed || entry.en === trimmed);
	return pickPair(pair, stored, lang);
}

export function catalogBulletinSection(stored: string, lang: CatalogLang): string {
	const trimmed = stored.trim();
	const pair = CI_BULLETIN_SECTIONS[trimmed]
		?? Object.values(CI_BULLETIN_SECTIONS).find(entry => entry.fr === trimmed || entry.en === trimmed);
	return pickPair(pair, stored, lang);
}

export function catalogCategory(stored: string, lang: CatalogLang): string {
	const trimmed = stored.trim();
	const pair = CI_SUBJECT_CATEGORIES[trimmed]
		?? Object.values(CI_SUBJECT_CATEGORIES).find(entry => entry.fr === trimmed || entry.en === trimmed);
	return pickPair(pair, stored, lang);
}

export function catalogExamName(stored: string, lang: CatalogLang): string {
	const trimmed = stored.trim();
	const pair = CI_EXAMS[trimmed]
		?? Object.values(CI_EXAMS).find(entry => entry.fr === trimmed || entry.en === trimmed);
	return pickPair(pair, stored, lang);
}

export function catalogDocumentLabel(stored: string, lang: CatalogLang): string {
	return pickPair(CI_DOCUMENT_LABELS[stored.trim()], stored, lang);
}

export function catalogText(stored: string, lang: CatalogLang): string {
	const trimmed = stored.trim();
	if (!trimmed) {
		return stored;
	}
	if (CI_SUBJECTS[trimmed]) {
		return catalogSubjectName(trimmed, lang, trimmed);
	}
	const subject = catalogSubjectName(trimmed, lang);
	if (subject !== trimmed) {
		return subject;
	}
	const grade = catalogGradeName(trimmed, lang);
	if (grade !== trimmed) {
		return grade;
	}
	const className = catalogClassName(trimmed, lang);
	if (className !== trimmed) {
		return className;
	}
	const period = catalogPeriodLabel(trimmed, lang);
	if (period !== trimmed) {
		return period;
	}
	const slot = catalogSlotLabel(trimmed, lang);
	if (slot !== trimmed) {
		return slot;
	}
	const matter = catalogMatter(trimmed, lang);
	if (matter !== trimmed) {
		return matter;
	}
	const domain = catalogDomain(trimmed, lang);
	if (domain !== trimmed) {
		return domain;
	}
	const cycle = catalogCycle(trimmed, lang);
	if (cycle !== trimmed) {
		return cycle;
	}
	const section = catalogBulletinSection(trimmed, lang);
	if (section !== trimmed) {
		return section;
	}
	const category = catalogCategory(trimmed, lang);
	if (category !== trimmed) {
		return category;
	}
	return catalogExamName(trimmed, lang);
}

export function toCanonicalCatalogText(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) {
		return value;
	}
	const trimester = trimmed.match(TRIMESTRE_EN) ?? trimmed.match(TRIMESTRE_FR);
	if (trimester && TRIMESTRE_EN.test(trimmed)) {
		return `Trimestre ${trimester[1]}`;
	}
	const semester = trimmed.match(SEMESTRE_EN) ?? trimmed.match(SEMESTRE_FR);
	if (semester && SEMESTRE_EN.test(trimmed)) {
		return `Semestre ${semester[1]}`;
	}
	const slot = trimmed.match(SLOT_PERIOD_EN);
	if (slot) {
		return `Période ${slot[1]}`;
	}
	const mapped = EN_TO_FR.get(trimmed);
	if (mapped) {
		return mapped;
	}
	for (const short of GRADE_SHORTS) {
		if (trimmed === short.en) {
			return short.fr;
		}
		if (trimmed.startsWith(`${short.en} `)) {
			return `${short.fr}${trimmed.slice(short.en.length)}`;
		}
	}
	return value;
}

export function catalogLangFromLocale(locale?: string | null): CatalogLang {
	return locale?.toLowerCase().startsWith('en') ? 'en' : 'fr';
}

export {
	CI_BULLETIN_SECTIONS,
	CI_CYCLES,
	CI_DOCUMENT_LABELS,
	CI_DOMAINS,
	CI_EXAMS,
	CI_GRADES,
	CI_MATTERS,
	CI_SLOT_LABELS,
	CI_SUBJECT_CATEGORIES,
	CI_SUBJECTS,
};
