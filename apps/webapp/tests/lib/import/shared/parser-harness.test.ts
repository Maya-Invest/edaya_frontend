import {
	buildBillingImportXlsxBufferFromRows,
	parseBillingImportCsvText,
	parseBillingImportXlsxBuffer,
} from '$lib/import/billing/parser';
import {
	buildChapterImportXlsxBufferFromRows,
	parseChapterImportCsvText,
	parseChapterImportXlsxBuffer,
} from '$lib/import/chapters/parser';
import {
	buildClassImportXlsxBufferFromRows,
	parseClassImportCsvText,
	parseClassImportXlsxBuffer,
} from '$lib/import/classes/parser';
import {
	buildGuardianImportXlsxBufferFromRows,
	parseGuardianImportCsvText,
	parseGuardianImportXlsxBuffer,
} from '$lib/import/guardians/parser';
import {
	buildPaymentImportXlsxBufferFromRows,
	parsePaymentImportCsvText,
	parsePaymentImportXlsxBuffer,
} from '$lib/import/payments/parser';
import {
	buildStaffImportXlsxBufferFromRows,
	parseStaffImportCsvText,
	parseStaffImportXlsxBuffer,
} from '$lib/import/staff/parser';
import {
	buildStudentImportXlsxBufferFromRows,
	parseStudentImportCsvText,
	parseStudentImportXlsxBuffer,
} from '$lib/import/students/parser';
import {
	buildSubjectImportXlsxBufferFromRows,
	parseSubjectImportCsvText,
	parseSubjectImportXlsxBuffer,
} from '$lib/import/subjects/parser';
import {
	buildTeacherImportXlsxBufferFromRows,
	parseTeacherImportCsvText,
	parseTeacherImportXlsxBuffer,
} from '$lib/import/teachers/parser';
import { describe, expect, it } from 'bun:test';

interface LooseRow {
	rowIndex: number;
}

interface ParsedImport<Row extends LooseRow> {
	rows: Row[];
	errors: Array<{ message: string }>;
}

interface ParserPack<Row extends LooseRow = LooseRow> {
	name: string;
	csv: string;
	xlsxRows: (string | number)[][];
	parseCsv: (csv: string) => ParsedImport<Row>;
	parseXlsx: (buffer: ArrayBuffer) => ParsedImport<Row>;
	buildXlsx: (rows: (string | number)[][]) => ArrayBuffer;
	expectedRows: Row[];
}

function definePack<Row extends LooseRow>(pack: ParserPack<Row>): ParserPack {
	return pack;
}

const PACKS = [
	definePack({
		name: 'students',
		csv: `prenom,nom,classe,date_naissance,genre,matricule
Jean,Dupont,6ème A,2012-03-15,M,MAT-2024-001
Marie,Kouassi,6ème A,2011-07-22,F,MAT-2024-002
`,
		xlsxRows: [
			['prenom', 'nom', 'classe', 'date_naissance', 'genre', 'matricule'],
			['Jean', 'Dupont', '6ème A', '2012-03-15', 'M', 'MAT-2024-001'],
			['Marie', 'Kouassi', '6ème A', '2011-07-22', 'F', 'MAT-2024-002'],
		],
		parseCsv: parseStudentImportCsvText,
		parseXlsx: parseStudentImportXlsxBuffer,
		buildXlsx: buildStudentImportXlsxBufferFromRows,
		expectedRows: [
			{
				rowIndex: 2,
				prenom: 'Jean',
				nom: 'Dupont',
				classe: '6ème A',
				date_naissance: '2012-03-15',
				genre: 'M',
				matricule: 'MAT-2024-001',
			},
			{
				rowIndex: 3,
				prenom: 'Marie',
				nom: 'Kouassi',
				classe: '6ème A',
				date_naissance: '2011-07-22',
				genre: 'F',
				matricule: 'MAT-2024-002',
			},
		],
	}),
	definePack({
		name: 'staff',
		csv: `code,prenom,nom,role,email,telephone
PER-001,Fatou,Diallo,Secrétaire,fatou.diallo@example.com,+225 05 00 00 00 00
PER-002,Kofi,Mensah,Directeur adjoint,kofi.mensah@example.com,
`,
		xlsxRows: [
			['code', 'prenom', 'nom', 'role', 'email', 'telephone'],
			['PER-001', 'Fatou', 'Diallo', 'Secrétaire', 'fatou.diallo@example.com', '+225 05 00 00 00 00'],
			['PER-002', 'Kofi', 'Mensah', 'Directeur adjoint', 'kofi.mensah@example.com', ''],
		],
		parseCsv: parseStaffImportCsvText,
		parseXlsx: parseStaffImportXlsxBuffer,
		buildXlsx: buildStaffImportXlsxBufferFromRows,
		expectedRows: [
			{
				rowIndex: 2,
				code: 'PER-001',
				prenom: 'Fatou',
				nom: 'Diallo',
				role: 'Secrétaire',
				email: 'fatou.diallo@example.com',
				telephone: '+225 05 00 00 00 00',
			},
		],
	}),
	definePack({
		name: 'teachers',
		csv: `code,prenom,nom,email,telephone
ENS-001,Jean,Dupont,jean@example.com,+225 07 00 00 00 01
ENS-002,Marie,Martin,,+225 05 11 22 33 44
`,
		xlsxRows: [
			['code', 'prenom', 'nom', 'email', 'telephone'],
			['ENS-001', 'Jean', 'Dupont', 'jean@example.com', '+225 07 00 00 00 01'],
			['ENS-002', 'Marie', 'Martin', '', '+225 05 11 22 33 44'],
		],
		parseCsv: parseTeacherImportCsvText,
		parseXlsx: parseTeacherImportXlsxBuffer,
		buildXlsx: buildTeacherImportXlsxBufferFromRows,
		expectedRows: [
			{
				rowIndex: 2,
				code: 'ENS-001',
				prenom: 'Jean',
				nom: 'Dupont',
				email: 'jean@example.com',
				telephone: '+225 07 00 00 00 01',
			},
			{
				rowIndex: 3,
				code: 'ENS-002',
				prenom: 'Marie',
				nom: 'Martin',
				telephone: '+225 05 11 22 33 44',
			},
		],
	}),
	definePack({
		name: 'guardians',
		csv: `code,prenom,nom,email,telephone,eleve_matricule
TUT-001,Aminata,Koné,aminata.kone@example.com,+225 07 00 00 00 00,MAT-2024-001
TUT-002,Moussa,Traoré,,,MAT-2024-002
`,
		xlsxRows: [
			['code', 'prenom', 'nom', 'email', 'telephone', 'eleve_matricule'],
			['TUT-001', 'Aminata', 'Koné', 'aminata.kone@example.com', '+225 07 00 00 00 00', 'MAT-2024-001'],
			['TUT-002', 'Moussa', 'Traoré', '', '', 'MAT-2024-002'],
		],
		parseCsv: parseGuardianImportCsvText,
		parseXlsx: parseGuardianImportXlsxBuffer,
		buildXlsx: buildGuardianImportXlsxBufferFromRows,
		expectedRows: [
			{
				rowIndex: 2,
				code: 'TUT-001',
				prenom: 'Aminata',
				nom: 'Koné',
				email: 'aminata.kone@example.com',
				telephone: '+225 07 00 00 00 00',
				eleve_matricule: 'MAT-2024-001',
			},
		],
	}),
	definePack({
		name: 'billing',
		csv: `matricule,type_frais,montant,date_echeance
CI-2025-001,Scolarité — Collège,,2025-10-01
CI-2025-002,Scolarité — Collège,150000,2025-10-05
`,
		xlsxRows: [
			['matricule', 'type_frais', 'montant', 'date_echeance'],
			['CI-2025-001', 'Scolarité — Collège', '', '2025-10-01'],
			['CI-2025-002', 'Scolarité — Collège', '150000', '2025-10-05'],
		],
		parseCsv: parseBillingImportCsvText,
		parseXlsx: parseBillingImportXlsxBuffer,
		buildXlsx: buildBillingImportXlsxBufferFromRows,
		expectedRows: [
			{
				rowIndex: 2,
				matricule: 'CI-2025-001',
				type_frais: 'Scolarité — Collège',
				date_echeance: '2025-10-01',
			},
			{
				rowIndex: 3,
				matricule: 'CI-2025-002',
				type_frais: 'Scolarité — Collège',
				montant: '150000',
				date_echeance: '2025-10-05',
			},
		],
	}),
	definePack({
		name: 'payments',
		csv: `matricule,type_frais,reference,montant,date,mode,notes
CI-2025-001,Scolarité — Collège,MM-CI-2025-100,75000,2025-09-01,mobile_money,1er versement
CI-2025-002,Scolarité — Collège,VIR-CI-2025-101,,2025-09-02,virement,Solde restant
`,
		xlsxRows: [
			['matricule', 'type_frais', 'reference', 'montant', 'date', 'mode', 'notes'],
			['CI-2025-001', 'Scolarité — Collège', 'MM-CI-2025-100', '75000', '2025-09-01', 'mobile_money', '1er versement'],
			['CI-2025-002', 'Scolarité — Collège', 'VIR-CI-2025-101', '', '2025-09-02', 'virement', 'Solde restant'],
		],
		parseCsv: parsePaymentImportCsvText,
		parseXlsx: parsePaymentImportXlsxBuffer,
		buildXlsx: buildPaymentImportXlsxBufferFromRows,
		expectedRows: [
			{
				rowIndex: 2,
				matricule: 'CI-2025-001',
				type_frais: 'Scolarité — Collège',
				reference: 'MM-CI-2025-100',
				montant: '75000',
				date: '2025-09-01',
				mode: 'mobile_money',
				notes: '1er versement',
			},
			{
				rowIndex: 3,
				matricule: 'CI-2025-002',
				type_frais: 'Scolarité — Collège',
				reference: 'VIR-CI-2025-101',
				date: '2025-09-02',
				mode: 'virement',
				notes: 'Solde restant',
			},
		],
	}),
	definePack({
		name: 'classes',
		csv: `nom,niveau,capacite
6ème A,6ème,35
6ème B,6ème,30
`,
		xlsxRows: [
			['nom', 'niveau', 'capacite'],
			['6ème A', '6ème', '35'],
			['6ème B', '6ème', '30'],
		],
		parseCsv: parseClassImportCsvText,
		parseXlsx: parseClassImportXlsxBuffer,
		buildXlsx: buildClassImportXlsxBufferFromRows,
		expectedRows: [
			{ rowIndex: 2, nom: '6ème A', niveau: '6ème', capacite: '35' },
			{ rowIndex: 3, nom: '6ème B', niveau: '6ème', capacite: '30' },
		],
	}),
	definePack({
		name: 'chapters',
		csv: [
			'niveau,matiere,titre,ordre,description',
			'6ème,Mathématiques,Les fractions,1,Introduction',
		].join('\n'),
		xlsxRows: [
			['niveau', 'matiere', 'titre', 'ordre', 'description'],
			['6ème', 'Français', 'La poésie', '2', 'Vers et rimes'],
		],
		parseCsv: parseChapterImportCsvText,
		parseXlsx: parseChapterImportXlsxBuffer,
		buildXlsx: buildChapterImportXlsxBufferFromRows,
		expectedRows: [
			{
				rowIndex: 2,
				niveau: '6ème',
				matiere: 'Mathématiques',
				titre: 'Les fractions',
				ordre: '1',
				description: 'Introduction',
			},
		],
	}),
	definePack({
		name: 'subjects',
		csv: [
			'nom,niveau,abbreviation,coefficient',
			'Mathématiques,6ème,MATH,3',
			'Anglais,6ème B,ANG,2',
		].join('\n'),
		xlsxRows: [
			['nom', 'niveau', 'abbreviation', 'coefficient'],
			['Physique', '5ème', 'PHY', '2'],
		],
		parseCsv: parseSubjectImportCsvText,
		parseXlsx: parseSubjectImportXlsxBuffer,
		buildXlsx: buildSubjectImportXlsxBufferFromRows,
		expectedRows: [
			{
				rowIndex: 2,
				nom: 'Mathématiques',
				niveau: '6ème',
				abbreviation: 'MATH',
				coefficient: '3',
			},
		],
	}),
];

describe('import parser harness', () => {
	it('parses csv rows, matches xlsx, and rejects a blank file', () => {
		for (const pack of PACKS) {
			const csvResult = pack.parseCsv(pack.csv);
			expect(csvResult.errors, pack.name).toEqual([]);
			expect(csvResult.rows.slice(0, pack.expectedRows.length), pack.name).toEqual(pack.expectedRows);

			const xlsxResult = pack.parseXlsx(pack.buildXlsx(pack.xlsxRows));
			expect(xlsxResult.errors, pack.name).toEqual([]);
			if (pack.name === 'chapters' || pack.name === 'subjects') {
				expect(xlsxResult.rows[0], pack.name).toMatchObject(
					pack.name === 'chapters'
						? { titre: 'La poésie', matiere: 'Français' }
						: { nom: 'Physique', niveau: '5ème' },
				);
			}
			else {
				expect(xlsxResult.rows[0], pack.name).toEqual(csvResult.rows[0]);
			}

			const blank = pack.parseCsv('   \n');
			expect(blank.rows, pack.name).toEqual([]);
			expect(blank.errors[0]?.message, pack.name).toBe('empty_file');
		}
	});

	it('strips a BOM from student headers', () => {
		const result = parseStudentImportCsvText('\uFEFFprenom,nom,classe\nJean,Dupont,6ème A\n');
		expect(result.errors).toEqual([]);
		expect(result.rows[0]?.prenom).toBe('Jean');
	});

	it('parses student xlsx dates stored as Excel serial numbers', () => {
		const result = parseStudentImportXlsxBuffer(buildStudentImportXlsxBufferFromRows([
			['prenom', 'nom', 'classe', 'date_naissance', 'genre', 'matricule'],
			['Awa', 'Koffi', '6ème B', 41112, 'F', 'MAT-2026-002'],
		]));
		expect(result.errors).toEqual([]);
		expect(result.rows[0]?.date_naissance).toBe('2012-07-22');
	});
});
