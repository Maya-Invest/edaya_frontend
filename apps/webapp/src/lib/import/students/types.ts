export interface StudentImportColumnDefinition {
	key: StudentImportColumnKey;
	required: boolean;
}

export const STUDENT_IMPORT_COLUMNS = [
	{ key: 'prenom', required: true },
	{ key: 'nom', required: true },
	{ key: 'classe', required: true },
	{ key: 'date_naissance', required: false },
	{ key: 'genre', required: false },
	{ key: 'matricule', required: false },
] as const satisfies readonly StudentImportColumnDefinition[];

export type StudentImportColumnKey = (typeof STUDENT_IMPORT_COLUMNS)[number]['key'];

export interface StudentImportRow {
	rowIndex: number;
	prenom: string;
	nom: string;
	classe: string;
	date_naissance?: string;
	genre?: string;
	matricule?: string;
}
