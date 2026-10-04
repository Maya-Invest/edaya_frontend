export interface GradeScale {
	id: string;
	schoolId: string;
	name: string;
	minScore: number;
	maxScore: number;
	passingScore: number;
	decimalPlaces: number;
	description?: string;
	isDefault?: boolean;
}

export type ReportCardPublishStatus = 'draft' | 'published';

export type ReportCardSectionKind = 'matieres' | 'synthese' | 'appreciation';

export type ReportCardSectionType = 'group' | 'subject';

export interface ReportCardSection {
	id: string;
	definitionId: string;
	name: string;
	sectionType: ReportCardSectionType;
	/** Semantic role for group sections. */
	kind?: ReportCardSectionKind;
	order: number;
	coefficient?: number;
	/** Nested group or subject sections. */
	children?: ReportCardSection[];
	/** Catalog subject id for subject sections. */
	subjectId?: string;
	/** Human-readable subject name for subject sections. */
	subjectLabel?: string;
}

export interface ReportCardDefinition {
	id: string;
	schoolId: string;
	name: string;
	academicYearId: string;
	gradeLevelId: string;
	gradeScaleId: string;
	status: ReportCardPublishStatus;
	sections: ReportCardSection[];
}

export type ReportCardResultStatus = 'draft' | 'generated' | 'published';

export interface ReportCardSubjectMark {
	subjectId: string;
	subjectName: string;
	average?: number;
	coefficient: number;
	appreciation?: string;
	teacherName?: string;
}

export interface ReportCardSectionResult {
	sectionId: string;
	sectionAverage?: number;
	marks: ReportCardSubjectMark[];
}

export interface ReportCommentSection {
	sectionId: string;
	name: string;
	comment: string;
}

export interface ReportCardResult {
	aggregation?: { source: 'assessments' | 'report_cards'; sourcePeriodIds: string[]; periodWeightsByPeriodId?: Record<string, number> } | null;
	commentSections?: ReportCommentSection[];
	version?: number;
	pendingAssessmentIds?: string[];
	pendingCorrectionIds?: string[];
	calculationStale?: boolean;
	id: string;
	schoolId: string;
	studentId: string;
	classId: string;
	definitionId: string;
	academicYearId: string;
	academicPeriodId: string;
	gradeScaleId: string;
	status: ReportCardResultStatus;
	overallAverage?: number;
	classRank: number;
	classSize: number;
	sectionResults: ReportCardSectionResult[];
	homeroomComment?: string;
	principalComment?: string;
	generatedAt?: string;
	publishedAt?: string;
}

export function formatGrade(value: number | undefined, scale: { decimalPlaces: number }): string {
	return value === undefined ? '—' : value.toFixed(Math.max(2, scale.decimalPlaces));
}
