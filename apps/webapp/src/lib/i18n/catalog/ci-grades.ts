import type { CatalogNamePair } from './ci-subjects';

export interface CatalogGradePair {
	name: CatalogNamePair;
	shortLabel: CatalogNamePair;
}

export const CI_GRADES: Record<string, CatalogGradePair> = {
	'6EME': { name: { fr: 'Sixième', en: '6th year' }, shortLabel: { fr: '6ème', en: '6th' } },
	'5EME': { name: { fr: 'Cinquième', en: '5th year' }, shortLabel: { fr: '5ème', en: '5th' } },
	'4EME': { name: { fr: 'Quatrième', en: '4th year' }, shortLabel: { fr: '4ème', en: '4th' } },
	'3EME': { name: { fr: 'Troisième', en: '3rd year' }, shortLabel: { fr: '3ème', en: '3rd' } },
	'2NDA': { name: { fr: 'Seconde A', en: '10th year A' }, shortLabel: { fr: '2nde A', en: '10th A' } },
	'2NDC': { name: { fr: 'Seconde C', en: '10th year C' }, shortLabel: { fr: '2nde C', en: '10th C' } },
	'1ERA': { name: { fr: 'Première A', en: '11th year A' }, shortLabel: { fr: '1ère A', en: '11th A' } },
	'1ERC': { name: { fr: 'Première C', en: '11th year C' }, shortLabel: { fr: '1ère C', en: '11th C' } },
	'1ERD': { name: { fr: 'Première D', en: '11th year D' }, shortLabel: { fr: '1ère D', en: '11th D' } },
	TLEA: { name: { fr: 'Terminale A', en: '12th year A' }, shortLabel: { fr: 'Tle A', en: '12th A' } },
	TLEC: { name: { fr: 'Terminale C', en: '12th year C' }, shortLabel: { fr: 'Tle C', en: '12th C' } },
	TLED: { name: { fr: 'Terminale D', en: '12th year D' }, shortLabel: { fr: 'Tle D', en: '12th D' } },
};
