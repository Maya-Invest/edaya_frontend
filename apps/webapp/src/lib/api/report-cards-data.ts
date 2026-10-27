import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ClassSubjectsSources } from '$lib/api/subjects-data';
import type {
	GradeScale,
	ReportCardResult,
	ReportCardResultStatus,
	ReportCardSectionResult,
	ReportCardSubjectMark,
} from '$lib/types/report-cards';
import {
	listAllEntityPages,
	reportCardResultsForClassPeriod,
	schoolScopedEntityList,
} from '$lib/api/entity-list-filters';
import { fetchClassSubjectsSources } from '$lib/api/subjects-data';
import { teacherNameForClassSubject } from '$lib/api/teacher-display';
import { lang } from '$lib/i18n';
import { catalogSubjectName } from '$lib/i18n/catalog-label';
import { get } from 'svelte/store';

type GradeScaleRaw = components['schemas']['GradeScale'];
type ReportCardResultRaw = components['schemas']['ReportCardResult'];

const GRADE_SCALES_CATALOG_SCOPE
	= 'Grade-scale configuration lists only the current school catalog after create/update.';

type GradeScaleRangeRaw = GradeScaleRaw['ranges'][number];

export function resolveClassSubjectId(
	catalogSubjectId: string,
	classGroupId: string,
	sources: ClassSubjectsSources,
): string | undefined {
	return sources.classSubjectsRaw.find(
		entry => entry.classGroupId === classGroupId && entry.subjectId === catalogSubjectId,
	)?.id;
}

export function subjectLabelForCatalogId(
	catalogSubjectId: string,
	sources: Pick<ClassSubjectsSources, 'subjectsRaw'>,
): string {
	const subject = sources.subjectsRaw.find(entry => entry.id === catalogSubjectId);
	if (!subject) {
		return catalogSubjectId;
	}
	return catalogSubjectName(subject.name, get(lang), subject.code);
}

function formatDate(value: unknown): string | undefined {
	if (!value) {
		return undefined;
	}
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}
	if (typeof value === 'string') {
		return value.slice(0, 10);
	}
	return String(value).slice(0, 10);
}

function teacherNameForClassSubjectFromSources(
	classSubjectId: string,
	sources: ClassSubjectsSources,
): string | undefined {
	const name = teacherNameForClassSubject(classSubjectId, sources, '');
	return name || undefined;
}

function buildDescriptionFromRanges(ranges: GradeScaleRangeRaw[]): string | undefined {
	if (ranges.length === 0 || !ranges.every(range => range.interpretation)) {
		return undefined;
	}
	return [...ranges]
		.reverse()
		.map(range => `${range.letter} = ${range.interpretation}`)
		.join(' · ');
}

export function mapGradeScales(scalesRaw: (Omit<GradeScaleRaw, 'revision' | 'roundingMode' | 'intervalConvention'> & Partial<Pick<GradeScaleRaw, 'revision' | 'roundingMode' | 'intervalConvention'>>)[]): GradeScale[] {
	return scalesRaw.map(scale => ({
		ranges: scale.ranges.map(row => ({ ...row })),
		revision: scale.revision,
		roundingMode: scale.roundingMode,
		intervalConvention: scale.intervalConvention,
		storedDescription: scale.description ?? undefined,
		id: scale.id,
		schoolId: scale.schoolId,
		name: scale.name,
		minScore: scale.minScore,
		maxScore: scale.maxScore,
		isDefault: scale.isDefault,
		decimalPlaces: scale.decimalPlaces ?? 1,
		description: scale.description ?? buildDescriptionFromRanges(scale.ranges),
	}));
}

interface ApiSectionResult {
	subjectId?: string;
	moduleId?: string;
	coefficient?: number;
	weightingMode?: 'subject_coefficients' | 'explicit';
	explicitWeight?: number;
	grading?: ReportCardResultRaw['grading'];
	sectionId?: string;
	sectionKind?: 'module' | 'subject';
	name?: string;
	average?: number;
	weight?: number;
	comment?: string | null;
	classSubjectId?: string | null;
	subResults?: ApiSectionResult[];
}

function mapResultStatus(status: ReportCardResultRaw['status']): ReportCardResultStatus {
	return status === 'published' ? 'published' : 'generated';
}

export function mapSubjectMark(
	subjectResult: ApiSectionResult,
	sources: ClassSubjectsSources,
): ReportCardSubjectMark | null {
	const classSubjectId = subjectResult.classSubjectId ?? undefined;
	if (!classSubjectId) {
		return null;
	}

	const classSubject = sources.classSubjectsRaw.find(entry => entry.id === classSubjectId);
	const catalogSubjectId = classSubject?.subjectId ?? subjectResult.name;
	const subject = catalogSubjectId
		? sources.subjectsRaw.find(entry => entry.id === catalogSubjectId)
		: undefined;

	const capturedLabel = subjectResult.name && subjectResult.name !== catalogSubjectId && subjectResult.name !== classSubjectId ? subjectResult.name : undefined;

	return {
		subjectId: classSubjectId,
		subjectName: capturedLabel
			? catalogSubjectName(capturedLabel, get(lang))
			: subject
				? catalogSubjectName(subject.name, get(lang), subject.code)
				: subjectLabelForCatalogId(catalogSubjectId ?? classSubjectId, sources),
		average: subjectResult.average,
		grading: subjectResult.grading,
		coefficient: subjectResult.coefficient,
		effectiveWeight: subjectResult.weight,
		appreciation: subjectResult.comment ?? undefined,
		teacherName: teacherNameForClassSubjectFromSources(classSubjectId, sources),
	};
}

function flattenSections(sections: ApiSectionResult[]): ApiSectionResult[] {
	return sections.flatMap(section => [section, ...flattenSections(section.subResults ?? [])]);
}

function mapSectionResults(
	sections: ApiSectionResult[],
	sources: ClassSubjectsSources,
): ReportCardSectionResult[] {
	return sections.map(section => ({
		sectionId: section.sectionId ?? '',
		name: section.name ?? '',
		sectionKind: section.sectionKind ?? 'subject',
		weight: section.weight ?? 0,
		weightingMode: section.weightingMode,
		explicitWeight: section.explicitWeight,
		sectionAverage: section.average,
		grading: section.grading,
		marks: flattenSections([section])
			.map(sub => mapSubjectMark(sub, sources))
			.filter((mark): mark is ReportCardSubjectMark => mark !== null),
	}));
}

export function mapReportCardResults(
	resultsRaw: (ReportCardResultRaw | NonNullable<ReportCardResultRaw['revisedDraft']>)[],
	sources: ClassSubjectsSources,
): ReportCardResult[] {
	return resultsRaw.map((result) => {
		return {
			id: result.id,
			schoolId: '',
			studentId: result.studentId,
			classId: result.classGroupId,
			gradeLevelId: result.gradeLevelId,
			reportConfigurationRevision: result.reportConfigurationRevision,
			academicYearId: result.academicYearId,
			academicPeriodId: result.periodId,
			passThreshold: result.passThreshold,
			gradeScaleId: result.grading?.scaleId ?? '',
			status: mapResultStatus(result.status),
			grading: result.grading,
			aggregateLabel: result.aggregateLabel,
			gradingPolicyRevision: result.gradingPolicyRevision,
			revisedDraft: 'revisedDraft' in result && result.revisedDraft ? mapReportCardResults([result.revisedDraft], sources)[0] : undefined,
			overallAverage: result.overallAverage ?? undefined,
			classRank: result.rank ?? undefined,
			classSize: result.classSize ?? undefined,
			sectionResults: mapSectionResults(
				(result.sectionResults ?? []) as ApiSectionResult[],
				sources,
			),
			commentSections: flattenSections((result.sectionResults ?? []) as ApiSectionResult[])
				.filter(section => Boolean(section.sectionId))
				.map(section => ({ sectionId: section.sectionId!, name: section.name ?? section.sectionId!, comment: section.comment ?? '' })),
			version: result.version,
			aggregation: result.aggregation,
			pendingAssessmentIds: result.pendingAssessmentIds,
			pendingCorrectionIds: result.pendingCorrectionIds,
			calculationStale: result.calculationStale,
			homeroomComment: result.teacherComment ?? undefined,
			principalComment: result.principalComment ?? undefined,
			generatedAt: formatDate(result.generatedAt),
			publishedAt: formatDate(result.publishedAt),
			publicationHistory: 'publicationHistory' in result ? result.publicationHistory : [],
		};
	});
}

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export async function loadGradeScalesCatalogData(
	client: SchoolClient,
	schoolId: string,
): Promise<GradeScale[]> {
	if (!schoolId) {
		return [];
	}
	const gradeScalesRaw = await listAllEntityPages(
		query => client.entities.gradeScales.list(query),
		{ baseQuery: schoolScopedEntityList(schoolId, GRADE_SCALES_CATALOG_SCOPE) },
	);
	return mapGradeScales(gradeScalesRaw);
}

export async function loadClassReportCardResultsData(
	client: SchoolClient,
	classGroupId: string,
	periodId: string,
): Promise<ReportCardResult[]> {
	const [resultsRaw, subjectsSources] = await Promise.all([
		listAllEntityPages(
			query => client.entities.results.list(query),
			{ baseQuery: reportCardResultsForClassPeriod(classGroupId, periodId) },
		),
		fetchClassSubjectsSources(client, classGroupId),
	]);
	return mapReportCardResults(resultsRaw ?? [], subjectsSources);
}
