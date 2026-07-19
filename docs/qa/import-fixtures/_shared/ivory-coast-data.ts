/** Données cohérentes pour la QA import — contexte collège ivoirien (Afrique de l'Ouest). */

export const GRADE_LEVELS = ['6ème', '5ème', '4ème', '3ème'] as const;

export const CLASSES = {
	sixA: '6ème A',
	sixB: '6ème B',
	sixC: '6ème C',
	fiveA: '5ème A',
	fiveB: '5ème B',
	fourB: '4ème B',
	threeA: '3ème A',
} as const;

/** Matricules partagés entre élèves, tuteurs et paiements (préfixe CI = Côte d'Ivoire). */
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

/** Jeu nominal 6ème — 7 matières du programme collège. */
export const SUBJECTS_SIXIEME = SUBJECT_CATALOG.map(subject => ({
	...subject,
	niveau: '6ème',
}));

/** Jeu 5ème — matières communes + Physique-Chimie (à partir de la 5ème). */
export const SUBJECTS_CINQUIEME = [
	...SUBJECT_CATALOG.map(subject => ({ ...subject, niveau: '5ème' })),
	{ nom: 'Physique-Chimie', niveau: '5ème', code: 'PC', coefficient: 2 },
];

/** Numéros mobiles Côte d'Ivoire (+225 07 Orange, 05 MTN, 01 Moov). */
export const PHONES = {
	aminata: '+225 07 08 12 34 56',
	kouadio: '+225 05 44 22 11 00',
	traore: '+225 01 02 03 04 05',
} as const;

/** Type de frais — doit correspondre au catalogue de l'école (voir README). */
export const FEE_SCHOOL = 'Frais de scolarité';

export function studentToRow(student: StudentFixture): (string | number)[] {
	return [student.prenom, student.nom, student.matricule, student.classe, student.date_naissance, student.genre];
}

export const STUDENT_HEADERS = ['prenom', 'nom', 'matricule', 'classe', 'date_naissance', 'genre'] as const;
