import type { SchoolSubjectCatalogEntry } from '$lib/import/shared/load-school-subject-names';
import type { ImportClassOption } from '$lib/import/shared/resolve-import-class-group';

export type TeacherAssignmentImportColumnKey = 'code' | 'classe' | 'matiere';

export interface TeacherAssignmentImportColumnDefinition {
	key: TeacherAssignmentImportColumnKey;
	required: boolean;
}

export const TEACHER_ASSIGNMENT_IMPORT_COLUMNS = [
	{ key: 'code', required: true },
	{ key: 'classe', required: true },
	{ key: 'matiere', required: true },
] as const satisfies readonly TeacherAssignmentImportColumnDefinition[];

export interface TeacherAssignmentImportRow {
	rowIndex: number;
	code: string;
	classe: string;
	matiere: string;
}

export interface TeacherAssignmentImportTeacherOption {
	id: string;
	code: string;
	name: string;
}

export interface TeacherAssignmentImportClassSubjectOption {
	id: string;
	classGroupId: string;
	subjectId: string;
}

export interface ValidatedTeacherAssignmentImportRow extends TeacherAssignmentImportRow {
	teacherId: string;
	teacherName: string;
	classGroupId: string;
	classSubjectId: string;
}

export type TeacherAssignmentImportValidationSeverity = 'error' | 'warning';

export interface TeacherAssignmentImportValidationIssue {
	rowIndex: number;
	column?: TeacherAssignmentImportColumnKey;
	value?: string;
	messageKey: string;
	messageParams?: Record<string, string | number>;
	severity: TeacherAssignmentImportValidationSeverity;
	suggestions?: string[];
}

export interface TeacherAssignmentImportValidationResult {
	validRows: ValidatedTeacherAssignmentImportRow[];
	errors: TeacherAssignmentImportValidationIssue[];
	warnings: TeacherAssignmentImportValidationIssue[];
}

export interface TeacherAssignmentImportValidationContext {
	teachers: readonly TeacherAssignmentImportTeacherOption[];
	classes: readonly ImportClassOption[];
	subjectCatalog: readonly SchoolSubjectCatalogEntry[];
	classSubjects: readonly TeacherAssignmentImportClassSubjectOption[];
}
