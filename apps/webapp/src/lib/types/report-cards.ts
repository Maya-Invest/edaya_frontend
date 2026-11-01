import type { components } from '$lib/api/schema';

export interface GradeScaleRange {
	id?: string;
	letter: string;
	interpretation?: string | null;
	minScore: number;
	maxScore: number;

	gpaValue?: number | null;
}

export interface GradeScale {
	ranges?: GradeScaleRange[];
	revision?: number;
	roundingMode?: 'nearest' | 'truncate';
	intervalConvention?: 'legacy-closed' | 'continuous';
	storedDescription?: string;
	id: string;
	schoolId: string;
	name: string;
	minScore: number;
	maxScore: number;
	decimalPlaces: number;
	description?: string;
	isDefault?: boolean;
}

export type ReportModule = components['schemas']['ReportModule'];

export type ReportCardResultStatus = 'draft' | 'generated' | 'published';

export interface ReportCardSubjectMark {
	grading?: components['schemas']['ReportCardResult']['grading'];
	subjectId: string;
	subjectName: string;
	average?: number;
	coefficient?: number;
	effectiveWeight?: number;
	appreciation?: string;
	teacherName?: string;
}

export interface ReportCardSectionResult {
	name: string;
	sectionKind: 'module' | 'subject';
	weight: number;
	weightingMode?: 'subject_coefficients' | 'explicit';
	explicitWeight?: number;
	grading?: components['schemas']['ReportCardResult']['grading'];
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
	publicationHistory?: components['schemas']['ReportCardResult']['publicationHistory'];
	passThreshold?: number | null;
	grading?: components['schemas']['ReportCardResult']['grading'];
	aggregateLabel?: string;
	gradingPolicyRevision?: number;
	revisedDraft?: ReportCardResult;
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
	gradeLevelId: string;
	reportConfigurationRevision: number;
	academicYearId: string;
	academicPeriodId: string;
	gradeScaleId: string;
	status: ReportCardResultStatus;
	overallAverage?: number;
	classRank?: number;
	classSize?: number;
	sectionResults: ReportCardSectionResult[];
	homeroomComment?: string;
	principalComment?: string;
	generatedAt?: string;
	publishedAt?: string;
}

export function formatGrade(value: number | undefined, scale: { decimalPlaces: number }): string {
	return value === undefined ? '—' : value.toFixed(Math.max(2, scale.decimalPlaces));
}

export function formatCalculatedGrade(grade: NonNullable<components['schemas']['ReportCardResult']['grading']>): string {
	return `${grade.reportedValue.toFixed(grade.decimalPlaces)} / ${grade.maximum} · ${grade.mention.code}`;
}

/** Published historical results never borrow precision or mentions from today's scale. */
export function formatPersistedGrade(
	grading: ReportCardResult['grading'],
	value: number | undefined,
): string {
	if (grading)
		return formatCalculatedGrade(grading);
	return value === undefined ? '—' : String(value);
}

export function formatReportRank(result: Pick<ReportCardResult, 'classRank' | 'classSize'> | undefined): string {
	const rank = result?.classRank;
	const size = result?.classSize;
	return rank && size && rank > 0 && size >= rank ? `${rank}/${size}` : '—';
}

export function reportCardAvailability(result: ReportCardResult): { missingValues: boolean; missingGrading: boolean } {
	const grades = [
		{ grading: result.grading, value: result.overallAverage },
		...result.sectionResults.filter(section => section.marks.length > 0).flatMap(section => [
			{ grading: section.grading, value: section.sectionAverage },
			...section.marks.map(mark => ({ grading: mark.grading, value: mark.average })),
		]),
	];
	return {
		missingValues: formatReportRank(result) === '—' || grades.some(grade => !grade.grading && grade.value === undefined),
		missingGrading: grades.some(grade => !grade.grading && grade.value !== undefined),
	};
}
