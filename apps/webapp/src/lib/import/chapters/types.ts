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

/** Catalogue niveau + matière (une entrée par couple, pas par classe). */
export interface ChapterImportCatalogTarget {
	gradeLevelSubjectId: string;
	subjectId: string;
	gradeLevelId: string;
	gradeLevelName: string;
	subjectName: string;
	classAssignments: readonly ChapterImportClassAssignment[];
}

export interface ChapterImportClassAssignment {
	classGroupId: string;
	classSubjectId: string;
}

export interface ValidatedChapterImportRow extends ChapterImportRow {
	sequenceOrder: number;
	target: ChapterImportCatalogTarget;
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
	catalogTargets: readonly ChapterImportCatalogTarget[];
}
