import { describe, expect, it } from 'bun:test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
	CI_BULLETIN_SECTIONS,
	CI_DOMAINS,
	CI_GRADES,
	CI_MATTERS,
	CI_SUBJECTS,
	catalogBulletinSection,
	catalogClassName,
	catalogCycle,
	catalogDomain,
	catalogGradeName,
	catalogGradeShortLabel,
	catalogMatter,
	catalogPeriodLabel,
	catalogSlotLabel,
	catalogSubjectName,
	toCanonicalCatalogText,
} from '$lib/i18n/catalog-label';

describe('catalog-label', () => {
	it('keeps French catalog names in French', () => {
		expect(catalogSubjectName('Espagnol', 'fr', 'ESP')).toBe('Espagnol');
		expect(catalogGradeName('Seconde A', 'fr', '2NDA')).toBe('Seconde A');
		expect(catalogGradeShortLabel('2nde A', 'fr', '2NDA')).toBe('2nde A');
		expect(catalogPeriodLabel('Trimestre 1', 'fr')).toBe('Trimestre 1');
		expect(catalogSlotLabel('Période 3', 'fr')).toBe('Période 3');
		expect(catalogSlotLabel('Récréation', 'fr')).toBe('Récréation');
	});

	it('translates catalog names to English by code or stored FR label', () => {
		expect(catalogSubjectName('Espagnol', 'en', 'ESP')).toBe('Spanish');
		expect(catalogSubjectName('Éducation aux Droits de l\'Homme et à la Citoyenneté', 'en', 'EDHC'))
			.toBe('Human rights and citizenship education');
		expect(catalogGradeName('Seconde A', 'en', '2NDA')).toBe('10th year A');
		expect(catalogGradeShortLabel('2nde A', 'en', '2NDA')).toBe('10th A');
		expect(catalogClassName('2nde A 1', 'en')).toBe('10th A 1');
		expect(catalogClassName('6ème 2', 'en')).toBe('6th 2');
		expect(catalogPeriodLabel('Trimestre 1', 'en')).toBe('Term 1');
		expect(catalogPeriodLabel('Semestre 2', 'en')).toBe('Semester 2');
		expect(catalogSlotLabel('Période 1', 'en')).toBe('Period 1');
		expect(catalogSlotLabel('Pause déjeuner', 'en')).toBe('Lunch break');
		expect(catalogSlotLabel('Récréation', 'en')).toBe('Break');
		expect(catalogDomain('Langues', 'en')).toBe('Languages');
		expect(catalogCycle('Collège', 'en')).toBe('Lower secondary');
		expect(catalogBulletinSection('Bilan Lettre', 'en')).toBe('Languages results');
		expect(catalogBulletinSection('Appréciations', 'en')).toBe('Comments');
		expect(catalogMatter(
			'Lecture et compréhension de textes narratifs et documentaires',
			'en',
		)).toBe('Reading and comprehension of narrative and documentary texts');
	});

	it('does not translate school-entered custom labels', () => {
		expect(catalogSubjectName('Espagnol LV2', 'en', 'ESP')).toBe('Espagnol LV2');
		expect(catalogPeriodLabel('Exam week', 'en')).toBe('Exam week');
		expect(catalogClassName('Classe Teny', 'en')).toBe('Classe Teny');
		expect(catalogMatter('Chapitre maison', 'en')).toBe('Chapitre maison');
	});

	it('maps English display back to canonical French', () => {
		expect(toCanonicalCatalogText('Spanish')).toBe('Espagnol');
		expect(toCanonicalCatalogText('Term 2')).toBe('Trimestre 2');
		expect(toCanonicalCatalogText('Semester 1')).toBe('Semestre 1');
		expect(toCanonicalCatalogText('Period 4')).toBe('Période 4');
		expect(toCanonicalCatalogText('10th A 1')).toBe('2nde A 1');
		expect(toCanonicalCatalogText('Break')).toBe('Récréation');
	});
});

function ivoryCoastFixtureRoot(): string | null {
	const candidates = [
		join(import.meta.dir, '../../../../../../edaya_backend/tooling/fixtures/data/onboarding/ivory-coast'),
		join(import.meta.dir, '../../../../../../../edaya_backend/tooling/fixtures/data/onboarding/ivory-coast'),
	];
	for (const candidate of candidates) {
		try {
			if (existsSync(candidate) && statSync(candidate).isDirectory()) {
				return candidate;
			}
		}
		catch {
			// CI has no sibling edaya_backend checkout.
		}
	}
	return null;
}

function walkJsonFiles(root: string): string[] {
	const files: string[] = [];
	function walk(dir: string) {
		if (!existsSync(dir)) {
			return;
		}
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) {
				walk(path);
				continue;
			}
			if (entry.name.endsWith('.json') && entry.name !== 'fixture.json') {
				files.push(path);
			}
		}
	}
	walk(root);
	return files;
}

describe('CI catalog coverage', () => {
	it('has an English pair for every subject and grade code', () => {
		expect(Object.keys(CI_SUBJECTS).sort()).toEqual([
			'ALL',
			'ANG',
			'AP',
			'EDHC',
			'EPS',
			'ESP',
			'FR',
			'HG',
			'MATH',
			'MUS',
			'PC',
			'PHILO',
			'SVT',
			'TECH',
			'TICE',
		]);
		expect(Object.keys(CI_GRADES).sort()).toEqual([
			'1ERA',
			'1ERC',
			'1ERD',
			'2NDA',
			'2NDC',
			'3EME',
			'4EME',
			'5EME',
			'6EME',
			'TLEA',
			'TLEC',
			'TLED',
		]);
	});

	it('has an English chapter for every Ivory Coast fixture matter', () => {
		const root = ivoryCoastFixtureRoot();
		if (!root) {
			return;
		}
		const files = walkJsonFiles(root);

		const missing: string[] = [];
		for (const file of files) {
			const parsed = JSON.parse(readFileSync(file, 'utf8')) as {
				subjects?: Array<{ matters?: string[] }>;
			};
			for (const subject of parsed.subjects ?? []) {
				for (const matter of subject.matters ?? []) {
					if (!CI_MATTERS[matter]) {
						missing.push(matter);
					}
				}
			}
		}

		expect(missing).toEqual([]);
	});

	it('has English pairs for every Ivory Coast fixture grade, domain, and bulletin section', () => {
		expect(catalogPeriodLabel('Trimestre 1', 'en')).toBe('Term 1');
		expect(catalogPeriodLabel('Trimestre 3', 'en')).toBe('Term 3');

		const root = ivoryCoastFixtureRoot();
		if (!root) {
			// edaya_web CI has no sibling edaya_backend checkout.
			return;
		}
		const missingGrades: string[] = [];
		const missingDomains: string[] = [];
		const missingSections: string[] = [];

		for (const path of walkJsonFiles(root)) {
			const parsed = JSON.parse(readFileSync(path, 'utf8')) as {
				code?: string;
				name?: string;
				short_label?: string;
				sections?: Array<{ label?: string }>;
				subjects?: Array<{ domain?: string; code?: string }>;
			};
			if (parsed.code && !CI_GRADES[parsed.code]) {
				missingGrades.push(parsed.code);
			}
			for (const section of parsed.sections ?? []) {
				if (!section.label) {
					continue;
				}
				const known = Boolean(
					CI_BULLETIN_SECTIONS[section.label]
					?? Object.values(CI_BULLETIN_SECTIONS).find(pair => pair.fr === section.label || pair.en === section.label),
				);
				if (!known) {
					missingSections.push(section.label);
				}
			}
			for (const subject of parsed.subjects ?? []) {
				if (!subject.domain) {
					continue;
				}
				const known = Boolean(
					CI_DOMAINS[subject.domain]
					?? Object.values(CI_DOMAINS).find(pair => pair.fr === subject.domain || pair.en === subject.domain),
				);
				if (!known) {
					missingDomains.push(subject.domain);
				}
			}
		}

		expect(missingGrades).toEqual([]);
		expect([...new Set(missingDomains)]).toEqual([]);
		expect([...new Set(missingSections)]).toEqual([]);
	});
});
