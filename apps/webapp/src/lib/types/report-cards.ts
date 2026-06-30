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

export interface ReportCardSection {
	id: string;
	definitionId: string;
	name: string;
	kind: ReportCardSectionKind;
	order: number;
	coefficient?: number;
	/** Catalog subject ids from the report card definition. */
	subjectIds?: string[];
	/** Human-readable subject names aligned with `subjectIds`. */
	subjectLabels?: string[];
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
	average: number;
	coefficient: number;
	appreciation?: string;
	teacherName?: string;
}

export interface ReportCardSectionResult {
	sectionId: string;
	sectionAverage?: number;
	marks: ReportCardSubjectMark[];
}

export interface ReportCardResult {
	id: string;
	schoolId: string;
	studentId: string;
	classId: string;
	definitionId: string;
	academicYearId: string;
	academicPeriodId: string;
	gradeScaleId: string;
	status: ReportCardResultStatus;
	overallAverage: number;
	classRank: number;
	classSize: number;
	sectionResults: ReportCardSectionResult[];
	homeroomComment?: string;
	principalComment?: string;
	generatedAt?: string;
	publishedAt?: string;
}

export function formatGrade(value: number, scale: { decimalPlaces: number }): string {
	return value.toFixed(scale.decimalPlaces);
}
