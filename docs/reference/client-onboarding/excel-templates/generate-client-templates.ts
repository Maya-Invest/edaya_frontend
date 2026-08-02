/**
 * Génère les modèles Excel client pour l’import EDAYA (onboarding ops-led).
 * En-têtes alignés sur le catalogue webapp IMPORT_TYPE_DEFINITIONS
 * + fichier complémentaire professeurs principaux.
 *
 * Usage :
 *   bun edaya_web/docs/reference/client-onboarding/excel-templates/generate-client-templates.ts
 */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	GUARDIAN_HEADERS,
	STAFF_HEADERS,
	STUDENT_HEADERS,
	TEACHER_ASSIGNMENT_HEADERS,
	TEACHER_HEADERS,
} from '../../../qa/import-fixtures/_shared/ivory-coast-data.ts';
import { createXlsxWriter } from '../../../qa/import-fixtures/_shared/xlsx-writer.ts';

const outDir = dirname(fileURLToPath(import.meta.url));
const write = (sheetName: string) => createXlsxWriter(outDir, sheetName);

const CLASS_HEADERS = ['nom', 'niveau', 'capacite'] as const;
const SUBJECT_HEADERS = ['nom', 'niveau', 'abbreviation', 'coefficient'] as const;
const CHAPTER_HEADERS = ['niveau', 'matiere', 'titre', 'ordre', 'description'] as const;
const BILLING_HEADERS = ['matricule', 'type_frais', 'montant', 'date_echeance'] as const;
const PAYMENT_HEADERS = ['matricule', 'type_frais', 'reference', 'montant', 'date', 'mode', 'notes'] as const;
const HOMEROOM_HEADERS = ['code', 'classe'] as const;

write('ProfPrincipaux')('00-professeur-principal.xlsx', HOMEROOM_HEADERS, [
	['ENS-AKA-001', '6eme A'],
]);

write('Classes')('01-classes.xlsx', CLASS_HEADERS, [
	['6eme A', '6eme', 40],
]);

write('Matieres')('02-matieres.xlsx', SUBJECT_HEADERS, [
	['Mathématiques', '6eme', 'MATH', 3],
]);

write('Eleves')('03-eleves.xlsx', STUDENT_HEADERS, [
	['Kouadio', 'Yao', 'CI-2025-001', '6eme A', '2013-04-12', 'M'],
]);

write('Tuteurs')('04-tuteurs.xlsx', GUARDIAN_HEADERS, [
	['TUT-001', 'Aminata', 'Koné', 'CI-2025-001', 'parent.exemple@email.com', '+225 07 08 12 34 56'],
]);

write('Personnel')('05-personnel.xlsx', STAFF_HEADERS, [
	['PER-DIR-001', 'Aïcha', 'Koné', 'Directeur', 'direction@ecole.ci', '+225 07 20 30 40 50'],
]);

write('Enseignants')('06-enseignants.xlsx', TEACHER_HEADERS, [
	['ENS-AKA-001', 'Jean', 'Aka', 'j.aka@ecole.ci', '+225 05 44 22 11 00'],
]);

write('Affectations')('07-affectations-enseignants.xlsx', TEACHER_ASSIGNMENT_HEADERS, [
	['ENS-AKA-001', '6eme A', 'Mathématiques'],
]);

write('Chapitres')('08-chapitres.xlsx', CHAPTER_HEADERS, [
	['6eme', 'Mathématiques', 'Les fractions', 1, 'Introduction aux fractions simples'],
]);

write('Facturation')('09-facturation.xlsx', BILLING_HEADERS, [
	['CI-2025-001', 'Scolarité — Collège', '150000', '2025-10-15'],
]);

write('Paiements')('10-paiements.xlsx', PAYMENT_HEADERS, [
	['CI-2025-001', 'Scolarité — Collège', 'MM-CI-2025-001', '75000', '2025-09-15', 'mobile_money', 'Orange Money — T1'],
]);

console.log(`Client Excel templates written to ${outDir}`);
