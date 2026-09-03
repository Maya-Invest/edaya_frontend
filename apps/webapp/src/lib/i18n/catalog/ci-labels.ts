import type { CatalogNamePair } from './ci-subjects';

export const CI_DOMAINS: Record<string, CatalogNamePair> = {
	'Arts': { fr: 'Arts', en: 'Arts' },
	'Développement Physique': { fr: 'Développement Physique', en: 'Physical development' },
	'Langues': { fr: 'Langues', en: 'Languages' },
	'Sciences': { fr: 'Sciences', en: 'Sciences' },
	'Univers Social': { fr: 'Univers Social', en: 'Social studies' },
};

export const CI_SUBJECT_CATEGORIES: Record<string, CatalogNamePair> = {
	'Scientifique': { fr: 'Scientifique', en: 'Science' },
	'Littéraire': { fr: 'Littéraire', en: 'Literature' },
	'Langues': { fr: 'Langues', en: 'Languages' },
	'Sciences humaines': { fr: 'Sciences humaines', en: 'Humanities' },
	'Sport': { fr: 'Sport', en: 'Sport' },
	'Arts': { fr: 'Arts', en: 'Arts' },
};

export const CI_CYCLES: Record<string, CatalogNamePair> = {
	Collège: { fr: 'Collège', en: 'Lower secondary' },
	College: { fr: 'Collège', en: 'Lower secondary' },
	Lycée: { fr: 'Lycée', en: 'Upper secondary' },
	Lycee: { fr: 'Lycée', en: 'Upper secondary' },
};

export const CI_BULLETIN_SECTIONS: Record<string, CatalogNamePair> = {
	'Appréciations': { fr: 'Appréciations', en: 'Comments' },
	'Bilan autres': { fr: 'Bilan autres', en: 'Other results' },
	'Bilan Lettre': { fr: 'Bilan Lettre', en: 'Languages results' },
	'Bilan Science': { fr: 'Bilan Science', en: 'Science results' },
};

export const CI_EXAMS: Record<string, CatalogNamePair> = {
	'BEPC': { fr: 'BEPC', en: 'BEPC' },
	'BAC A': { fr: 'BAC A', en: 'Baccalaureate A' },
	'BAC C': { fr: 'BAC C', en: 'Baccalaureate C' },
	'BAC D': { fr: 'BAC D', en: 'Baccalaureate D' },
};

export const CI_SLOT_LABELS: Record<string, CatalogNamePair> = {
	'Récréation': { fr: 'Récréation', en: 'Break' },
	'Pause déjeuner': { fr: 'Pause déjeuner', en: 'Lunch break' },
};

export const CI_DOCUMENT_LABELS: Record<string, CatalogNamePair> = {
	TOTAL: { fr: 'TOTAL', en: 'TOTAL' },
};
