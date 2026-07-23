/** Données cohérentes pour la QA import — contexte collège ivoirien (Afrique de l'Ouest). */

export const GRADE_LEVELS = ['6eme', '5eme', '4eme', '3eme'] as const;

export const CLASSES = {
	sixA: '6eme A',
	sixB: '6eme B',
	sixC: '6eme C',
	fiveA: '5eme A',
	fiveB: '5eme B',
	fourB: '4eme B',
	threeA: '3eme A',
} as const;

/** Matricules partagés entre élèves, tuteurs, facturation et paiements (préfixe CI = Côte d'Ivoire). */
export const MATRICULES = {
	kouadioYao: 'CI-2025-001',
	aminataKone: 'CI-2025-002',
	nguessanKouassi: 'CI-2025-003',
	adjouaBamba: 'CI-2025-004',
	ibrahimTraore: 'CI-2025-005',
	mariamOuattara: 'CI-2025-006',
	seydouDiabate: 'CI-2025-007',
	akissiAssouan: 'CI-2025-008',
	lassinaKonate: 'CI-2025-009',
	affoueYeo: 'CI-2025-010',
	koffiAnan: 'CI-2025-011',
	salimataCoulibaly: 'CI-2025-012',
} as const;

export type StudentFixture = {
	prenom: string;
	nom: string;
	matricule: string;
	classe: string;
	date_naissance: string;
	genre: 'M' | 'F';
};

/** Jeu nominal d'élèves — noms et prénoms courants en Côte d'Ivoire. */
export const STUDENTS_HAPPY: readonly StudentFixture[] = [
	{ prenom: 'Kouadio', nom: 'Yao', matricule: MATRICULES.kouadioYao, classe: CLASSES.sixA, date_naissance: '2013-04-12', genre: 'M' },
	{ prenom: 'Aminata', nom: 'Koné', matricule: MATRICULES.aminataKone, classe: CLASSES.sixA, date_naissance: '2013-08-25', genre: 'F' },
	{ prenom: "N'Guessan", nom: 'Kouassi', matricule: MATRICULES.nguessanKouassi, classe: CLASSES.sixB, date_naissance: '2013-01-15', genre: 'M' },
	{ prenom: 'Adjoua', nom: 'Bamba', matricule: MATRICULES.adjouaBamba, classe: CLASSES.sixB, date_naissance: '2013-11-03', genre: 'F' },
	{ prenom: 'Ibrahim', nom: 'Traoré', matricule: MATRICULES.ibrahimTraore, classe: CLASSES.sixC, date_naissance: '2013-06-20', genre: 'M' },
	{ prenom: 'Mariam', nom: 'Ouattara', matricule: MATRICULES.mariamOuattara, classe: CLASSES.sixC, date_naissance: '2013-09-08', genre: 'F' },
	{ prenom: 'Seydou', nom: 'Diabaté', matricule: MATRICULES.seydouDiabate, classe: CLASSES.fiveA, date_naissance: '2012-03-18', genre: 'M' },
	{ prenom: 'Akissi', nom: 'Assouan', matricule: MATRICULES.akissiAssouan, classe: CLASSES.fiveA, date_naissance: '2012-07-22', genre: 'F' },
	{ prenom: 'Lassina', nom: 'Konaté', matricule: MATRICULES.lassinaKonate, classe: CLASSES.fiveB, date_naissance: '2012-12-05', genre: 'M' },
	{ prenom: 'Affoué', nom: 'Yéo', matricule: MATRICULES.affoueYeo, classe: CLASSES.fiveB, date_naissance: '2012-05-30', genre: 'F' },
	{ prenom: 'Koffi', nom: 'Anan', matricule: MATRICULES.koffiAnan, classe: CLASSES.fourB, date_naissance: '2011-02-14', genre: 'M' },
	{ prenom: 'Salimata', nom: 'Coulibaly', matricule: MATRICULES.salimataCoulibaly, classe: CLASSES.threeA, date_naissance: '2010-10-09', genre: 'F' },
];

/** Matières — libellés alignés sur le catalogue école (liste non exhaustive). */
export const SUBJECT_CATALOG = [
	{ nom: 'Anglais', code: 'ANG', coefficient: 2 },
	{ nom: 'Éducation aux Droits de l\'Homme et à la Citoyenneté', code: 'EDHC', coefficient: 1 },
	{ nom: 'Éducation Physique et Sportive', code: 'EPS', coefficient: 1 },
	{ nom: 'Français', code: 'FR', coefficient: 3 },
	{ nom: 'Histoire-Géographie', code: 'HG', coefficient: 2 },
	{ nom: 'Mathématiques', code: 'MATH', coefficient: 3 },
	{ nom: 'Sciences de la Vie et de la Terre', code: 'SVT', coefficient: 2 },
] as const;

/** Jeu nominal 6eme — 7 matières du programme collège. */
export const SUBJECTS_SIXIEME = SUBJECT_CATALOG.map(subject => ({
	...subject,
	niveau: '6eme',
}));

/** Jeu 5eme — matières communes + Physique-Chimie (à partir de la 5eme). */
export const SUBJECTS_CINQUIEME = [
	...SUBJECT_CATALOG.map(subject => ({ ...subject, niveau: '5eme' })),
	{ nom: 'Physique-Chimie', niveau: '5eme', code: 'PC', coefficient: 2 },
];

/** Numéros mobiles Côte d'Ivoire (+225 07 Orange, 05 MTN, 01 Moov). */
export const PHONES = {
	aminata: '+225 07 08 12 34 56',
	kouadio: '+225 05 44 22 11 00',
	traore: '+225 01 02 03 04 05',
	secretariat: '+225 07 20 30 40 50',
	cpe: '+225 05 30 40 50 60',
} as const;

/** Codes métier — identité unique école (C12) ; partagés enseignants ↔ affectations. */
export const TEACHER_CODES = {
	aka: 'ENS-AKA-001',
	assi: 'ENS-ASSI-001',
	gbe: 'ENS-GBE-001',
	zongo: 'ENS-ZONGO-001',
	kone: 'ENS-KONE-001',
	yao: 'ENS-YAO-001',
} as const;

export type TeacherFixture = {
	code: string;
	prenom: string;
	nom: string;
	email: string;
	telephone: string;
};

/**
 * Jeu nominal EN01 — 50 enseignants (codes uniques école).
 * Les 6 premiers codes restent alignés sur `TEACHER_CODES` (autres fixtures TA*).
 */
export const TEACHERS_EN01: readonly TeacherFixture[] = [
	{ code: TEACHER_CODES.aka, prenom: 'Jean-Baptiste', nom: 'Aka', email: 'j.aka@ecole-ci.edaya.dev', telephone: PHONES.kouadio },
	{ code: TEACHER_CODES.assi, prenom: 'Fatou', nom: 'Assi', email: 'f.assi@ecole-ci.edaya.dev', telephone: '+225 05 11 22 33 44' },
	{ code: TEACHER_CODES.gbe, prenom: 'Paul', nom: 'Gbé', email: 'p.gbe@ecole-ci.edaya.dev', telephone: '+225 07 33 44 55 66' },
	{ code: TEACHER_CODES.zongo, prenom: 'Mariam', nom: 'Zongo', email: 'm.zongo@ecole-ci.edaya.dev', telephone: '+225 01 44 55 66 77' },
	{ code: TEACHER_CODES.kone, prenom: 'Aminata', nom: 'Koné', email: 'a.kone@ecole-ci.edaya.dev', telephone: PHONES.aminata },
	{ code: TEACHER_CODES.yao, prenom: 'Kouadio', nom: 'Yao', email: 'k.yao@ecole-ci.edaya.dev', telephone: PHONES.traore },
	{ code: 'ENS-TOURE-001', prenom: 'Awa', nom: 'Touré', email: 'a.toure@ecole-ci.edaya.dev', telephone: '+225 07 10 11 12 13' },
	{ code: 'ENS-DIOM-001', prenom: 'Kader', nom: 'Diomandé', email: 'k.diomande@ecole-ci.edaya.dev', telephone: '+225 05 14 15 16 17' },
	{ code: 'ENS-BAMBA-001', prenom: 'Adjoua', nom: 'Bamba', email: 'a.bamba@ecole-ci.edaya.dev', telephone: '+225 01 18 19 20 21' },
	{ code: 'ENS-TRAORE-001', prenom: 'Ibrahim', nom: 'Traoré', email: 'i.traore@ecole-ci.edaya.dev', telephone: '+225 07 22 23 24 25' },
	{ code: 'ENS-OUATT-001', prenom: 'Salimata', nom: 'Ouattara', email: 's.ouattara@ecole-ci.edaya.dev', telephone: '+225 05 26 27 28 29' },
	{ code: 'ENS-KOUAS-001', prenom: "N'Guessan", nom: 'Kouassi', email: 'n.kouassi@ecole-ci.edaya.dev', telephone: '+225 01 30 31 32 33' },
	{ code: 'ENS-COULI-001', prenom: 'Fatim', nom: 'Coulibaly', email: 'f.coulibaly@ecole-ci.edaya.dev', telephone: '+225 07 34 35 36 37' },
	{ code: 'ENS-DIABA-001', prenom: 'Seydou', nom: 'Diabaté', email: 's.diabate@ecole-ci.edaya.dev', telephone: '+225 05 38 39 40 41' },
	{ code: 'ENS-ASSOU-001', prenom: 'Akissi', nom: 'Assouan', email: 'a.assouan@ecole-ci.edaya.dev', telephone: '+225 01 42 43 44 45' },
	{ code: 'ENS-KONAT-001', prenom: 'Lassina', nom: 'Konaté', email: 'l.konate@ecole-ci.edaya.dev', telephone: '+225 07 46 47 48 49' },
	{ code: 'ENS-YEO-001', prenom: 'Affoué', nom: 'Yéo', email: 'a.yeo@ecole-ci.edaya.dev', telephone: '+225 05 50 51 52 53' },
	{ code: 'ENS-ANAN-001', prenom: 'Koffi', nom: 'Anan', email: 'k.anan@ecole-ci.edaya.dev', telephone: '+225 01 54 55 56 57' },
	{ code: 'ENS-SANGA-001', prenom: 'Aïcha', nom: 'Sangaré', email: 'a.sangare@ecole-ci.edaya.dev', telephone: '+225 07 58 59 60 61' },
	{ code: 'ENS-FOFANA-001', prenom: 'Moussa', nom: 'Fofana', email: 'm.fofana@ecole-ci.edaya.dev', telephone: '+225 05 62 63 64 65' },
	{ code: 'ENS-CAMARA-001', prenom: 'Rokia', nom: 'Camara', email: 'r.camara@ecole-ci.edaya.dev', telephone: '+225 01 66 67 68 69' },
	{ code: 'ENS-CISSE-001', prenom: 'Bakary', nom: 'Cissé', email: 'b.cisse@ecole-ci.edaya.dev', telephone: '+225 07 70 71 72 73' },
	{ code: 'ENS-DOUMB-001', prenom: 'Inès', nom: 'Doumbia', email: 'i.doumbia@ecole-ci.edaya.dev', telephone: '+225 05 74 75 76 77' },
	{ code: 'ENS-KOFFI-001', prenom: 'Yves', nom: 'Koffi', email: 'y.koffi@ecole-ci.edaya.dev', telephone: '+225 01 78 79 80 81' },
	{ code: 'ENS-BLE-001', prenom: 'Christelle', nom: 'Blé', email: 'c.ble@ecole-ci.edaya.dev', telephone: '+225 07 82 83 84 85' },
	{ code: 'ENS-GNALI-001', prenom: 'Serge', nom: 'Gnaly', email: 's.gnaly@ecole-ci.edaya.dev', telephone: '+225 05 86 87 88 89' },
	{ code: 'ENS-EHUI-001', prenom: 'Patricia', nom: 'Ehui', email: 'p.ehui@ecole-ci.edaya.dev', telephone: '+225 01 90 91 92 93' },
	{ code: 'ENS-LOBA-001', prenom: 'Michel', nom: 'Loba', email: 'm.loba@ecole-ci.edaya.dev', telephone: '+225 07 94 95 96 97' },
	{ code: 'ENS-TANOH-001', prenom: 'Grace', nom: 'Tanoh', email: 'g.tanoh@ecole-ci.edaya.dev', telephone: '+225 05 98 99 00 01' },
	{ code: 'ENS-BROU-001', prenom: 'Didier', nom: 'Brou', email: 'd.brou@ecole-ci.edaya.dev', telephone: '+225 01 02 04 06 08' },
	{ code: 'ENS-NCHO-001', prenom: 'Estelle', nom: 'Ncho', email: 'e.ncho@ecole-ci.edaya.dev', telephone: '+225 07 03 05 07 09' },
	{ code: 'ENS-SORO-001', prenom: 'Hamed', nom: 'Soro', email: 'h.soro@ecole-ci.edaya.dev', telephone: '+225 05 10 12 14 16' },
	{ code: 'ENS-SILUE-001', prenom: 'Nadège', nom: 'Silué', email: 'n.silue@ecole-ci.edaya.dev', telephone: '+225 01 11 13 15 17' },
	{ code: 'ENS-DIARRA-001', prenom: 'Oumar', nom: 'Diarra', email: 'o.diarra@ecole-ci.edaya.dev', telephone: '+225 07 18 20 22 24' },
	{ code: 'ENS-KEITA-001', prenom: 'Djénéba', nom: 'Keita', email: 'd.keita@ecole-ci.edaya.dev', telephone: '+225 05 19 21 23 25' },
	{ code: 'ENS-BALLA-001', prenom: 'Amadou', nom: 'Ballay', email: 'a.ballay@ecole-ci.edaya.dev', telephone: '+225 01 26 28 30 32' },
	{ code: 'ENS-MEITE-001', prenom: 'Mariame', nom: 'Meité', email: 'm.meite@ecole-ci.edaya.dev', telephone: '+225 07 27 29 31 33' },
	{ code: 'ENS-KONE-002', prenom: 'Boubacar', nom: 'Koné', email: 'b.kone@ecole-ci.edaya.dev', telephone: '+225 05 34 36 38 40' },
	{ code: 'ENS-YAO-002', prenom: 'Ahou', nom: 'Yao', email: 'a.yao@ecole-ci.edaya.dev', telephone: '+225 01 35 37 39 41' },
	{ code: 'ENS-KOUAD-001', prenom: 'Etienne', nom: 'Kouadio', email: 'e.kouadio@ecole-ci.edaya.dev', telephone: '+225 07 42 44 46 48' },
	{ code: 'ENS-GNANGO-001', prenom: 'Clarisse', nom: 'Gnango', email: 'c.gnango@ecole-ci.edaya.dev', telephone: '+225 05 43 45 47 49' },
	{ code: 'ENS-ADOU-001', prenom: 'Jacques', nom: 'Adou', email: 'j.adou@ecole-ci.edaya.dev', telephone: '+225 01 50 52 54 56' },
	{ code: 'ENS-BOGUI-001', prenom: 'Sylvie', nom: 'Bogui', email: 's.bogui@ecole-ci.edaya.dev', telephone: '+225 07 51 53 55 57' },
	{ code: 'ENS-DJE-001', prenom: 'Hervé', nom: 'Djé', email: 'h.dje@ecole-ci.edaya.dev', telephone: '+225 05 58 60 62 64' },
	{ code: 'ENS-KAMARA-001', prenom: 'Fanta', nom: 'Kamara', email: 'f.kamara@ecole-ci.edaya.dev', telephone: '+225 01 59 61 63 65' },
	{ code: 'ENS-BERTE-001', prenom: 'Abdoulaye', nom: 'Berté', email: 'a.berte@ecole-ci.edaya.dev', telephone: '+225 07 66 68 70 72' },
	{ code: 'ENS-DIABY-001', prenom: 'Rokia', nom: 'Diaby', email: 'r.diaby@ecole-ci.edaya.dev', telephone: '+225 05 67 69 71 73' },
	{ code: 'ENS-GOGOUA-001', prenom: 'Wilfried', nom: 'Gogoua', email: 'w.gogoua@ecole-ci.edaya.dev', telephone: '+225 01 74 76 78 80' },
	{ code: 'ENS-TAPE-001', prenom: 'Esther', nom: 'Tapé', email: 'e.tape@ecole-ci.edaya.dev', telephone: '+225 07 75 77 79 81' },
	{ code: 'ENS-NIAVA-001', prenom: 'Franck', nom: 'Niava', email: 'f.niava@ecole-ci.edaya.dev', telephone: '+225 05 82 84 86 88' },
];

export function teacherToRow(teacher: TeacherFixture): (string | number)[] {
	return [teacher.code, teacher.prenom, teacher.nom, teacher.email, teacher.telephone];
}

export const STAFF_CODES = {
	kone: 'PER-KONE-001',
	yao: 'PER-YAO-001',
	kouassi: 'PER-KOUASSI-001',
	bamba: 'PER-BAMBA-001',
	traore: 'PER-TRAORE-001',
	ouattara: 'PER-OUATTARA-001',
} as const;

export const GUARDIAN_HEADERS = ['code', 'prenom', 'nom', 'eleve_matricule', 'email', 'telephone'] as const;

export const STAFF_HEADERS = ['code', 'prenom', 'nom', 'role', 'email', 'telephone'] as const;

export const TEACHER_HEADERS = ['code', 'prenom', 'nom', 'email', 'telephone'] as const;

export const TEACHER_ASSIGNMENT_HEADERS = ['code', 'classe', 'matiere'] as const;

/** Libellés matières utilisés dans les fixtures enseignants (alignés SU01). */
export const TEACHER_SUBJECT_NAMES = {
	francais: 'Français',
	maths: 'Mathématiques',
	anglais: 'Anglais',
	svt: 'Sciences de la Vie et de la Terre',
	hg: 'Histoire-Géographie',
	physique: 'Physique-Chimie',
} as const;

/** Types de frais — alignés sur le seed demo-ci (`edaya_backend/.../demo-ci/domains/finance.ts`). */
export const FEE_CATALOG_NAMES = [
	'Scolarité — Collège',
	'Transport scolaire',
	'Cantine',
	'Club sportif',
	'Fournitures scolaires',
] as const;

/** Frais principal utilisé dans les fixtures PA (scolarité collège). */
export const FEE_SCHOOL = FEE_CATALOG_NAMES[0];

export function studentToRow(student: StudentFixture): (string | number)[] {
	return [student.prenom, student.nom, student.matricule, student.classe, student.date_naissance, student.genre];
}

export const STUDENT_HEADERS = ['prenom', 'nom', 'matricule', 'classe', 'date_naissance', 'genre'] as const;
