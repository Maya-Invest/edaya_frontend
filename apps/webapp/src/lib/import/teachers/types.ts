import type { SchoolSubjectCatalogEntry } from '$lib/import/shared/load-school-subject-names';
import type { ImportClassOption } from '$lib/import/shared/resolve-import-class-group';

export type TeacherImportColumnKey = 'prenom' | 'nom' | 'email' | 'matieres' | 'telephone' | 'classe';

export interface TeacherImportColumnDefinition {
	key: TeacherImportColumnKey;
	required: boolean;
}

export const TEACHER_IMPORT_COLUMNS = [
	{ key: 'prenom', required: true },
	{ key: 'nom', required: true },
	{ key: 'email', required: false },
	{ key: 'matieres', required: false },
	{ key: 'telephone', required: false },
	{ key: 'classe', required: false },
] as const satisfies readonly TeacherImportColumnDefinition[];

export interface TeacherImportRow {
	rowIndex: number;
	prenom: string;
	nom: string;
	email?: string;
	matieres?: string;
	telephone?: string;
	classe?: string;
}

export interface TeacherImportClassSubjectOption {
	id: string;
	classGroupId: string;
	subjectId: string;
}

export interface ValidatedTeacherImportRow extends TeacherImportRow {
	subjectNames: string[];
	/** First catalog subject resolved from `matieres`; used to prefill manual assignments. */
	primarySubjectId?: string;
	classGroupId?: string;
	assignmentClassSubjectIds?: string[];
}

export type TeacherImportValidationSeverity = 'error' | 'warning';

export interface TeacherImportValidationIssue {
	rowIndex: number;
	column?: TeacherImportColumnKey;
	value?: string;
	messageKey: string;
	messageParams?: Record<string, string | number>;
	severity: TeacherImportValidationSeverity;
	suggestions?: string[];
}

export interface TeacherImportValidationResult {
	validRows: ValidatedTeacherImportRow[];
	errors: TeacherImportValidationIssue[];
	warnings: TeacherImportValidationIssue[];
}

export interface TeacherImportValidationContext {
	subjectCatalog: readonly SchoolSubjectCatalogEntry[];
	classes?: readonly ImportClassOption[];
	classSubjects?: readonly TeacherImportClassSubjectOption[];
}
