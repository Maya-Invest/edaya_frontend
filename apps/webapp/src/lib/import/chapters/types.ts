export type ChapterImportColumnKey = 'niveau' | 'matiere' | 'titre' | 'ordre' | 'description';

export interface ChapterImportColumnDefinition {

	key: ChapterImportColumnKey;

	required: boolean;

}

export const CHAPTER_IMPORT_COLUMNS = [

	{ key: 'niveau', required: true },

	{ key: 'matiere', required: true },

	{ key: 'titre', required: true },

	{ key: 'ordre', required: false },

	{ key: 'description', required: false },

] as const satisfies readonly ChapterImportColumnDefinition[];

export interface ChapterImportRow {

	rowIndex: number;

	niveau: string;

	matiere: string;

	titre: string;

	ordre?: string;

	description?: string;

}

export interface ChapterImportClassSubjectTarget {

	classSubjectId: string;

	subjectId: string;

	classGroupId: string;

	gradeLevelId: string;

	gradeLevelSubjectId?: string;

	subjectName: string;

	className: string;

	gradeLevelName: string;

}

export interface ValidatedChapterImportRow extends ChapterImportRow {

	sequenceOrder: number;

	targets: readonly ChapterImportClassSubjectTarget[];

}

export type ChapterImportValidationSeverity = 'error' | 'warning';

export interface ChapterImportValidationIssue {

	rowIndex: number;

	column?: ChapterImportColumnKey;

	value?: string;

	messageKey: string;

	messageParams?: Record<string, string | number>;

	severity: ChapterImportValidationSeverity;

	suggestions?: string[];

}

export interface ChapterImportValidationResult {

	validRows: ValidatedChapterImportRow[];

	errors: ChapterImportValidationIssue[];

	warnings: ChapterImportValidationIssue[];

}

export interface ChapterImportValidationContext {

	classSubjects: readonly ChapterImportClassSubjectTarget[];

}
