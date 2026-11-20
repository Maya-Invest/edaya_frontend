import { describe, expect, it } from 'bun:test';
import {
	catalogBulletinSection,
	catalogClassName,
	catalogCycle,
	catalogDomain,
	catalogGradeName,
	catalogMatter,
	catalogPeriodLabel,
	catalogSlotLabel,
	catalogSubjectName,
	toCanonicalCatalogText,
} from '$lib/i18n/catalog-label';

describe('catalog-label', () => {
	it('keeps stored French catalog names in French', () => {
		expect(catalogSubjectName('Espagnol', 'fr', 'ESP')).toBe('Espagnol');
		expect(catalogPeriodLabel('Trimestre 1', 'fr')).toBe('Trimestre 1');
	});

	it('translates known catalog codes and labels to English', () => {
		expect(catalogSubjectName('Espagnol', 'en', 'ESP')).toBe('Spanish');
		expect(catalogGradeName('Seconde A', 'en', '2NDA')).toBe('10th year A');
		expect(catalogClassName('6ème 2', 'en')).toBe('6th 2');
		expect(catalogPeriodLabel('Trimestre 1', 'en')).toBe('Term 1');
		expect(catalogSlotLabel('Récréation', 'en')).toBe('Break');
		expect(catalogDomain('Langues', 'en')).toBe('Languages');
		expect(catalogCycle('Collège', 'en')).toBe('Lower secondary');
		expect(catalogBulletinSection('Appréciations', 'en')).toBe('Comments');
		expect(catalogMatter('Lecture et compréhension de textes narratifs et documentaires', 'en'))
			.toBe('Reading and comprehension of narrative and documentary texts');
	});

	it('leaves school-entered labels unchanged', () => {
		expect(catalogSubjectName('Espagnol LV2', 'en', 'ESP')).toBe('Espagnol LV2');
		expect(catalogClassName('Classe Teny', 'en')).toBe('Classe Teny');
	});

	it('maps English display back to canonical French', () => {
		expect(toCanonicalCatalogText('Spanish')).toBe('Espagnol');
		expect(toCanonicalCatalogText('Term 2')).toBe('Trimestre 2');
		expect(toCanonicalCatalogText('Break')).toBe('Récréation');
	});
});
