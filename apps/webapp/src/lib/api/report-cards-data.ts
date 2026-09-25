import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ClassSubjectsSources } from '$lib/api/subjects-data';
import type {
	GradeScale,
	ReportCardDefinition,
	ReportCardPublishStatus,
	ReportCardResult,
	ReportCardResultStatus,
	ReportCardSection,
	ReportCardSectionKind,
	ReportCardSectionResult,
	ReportCardSubjectMark,
} from '$lib/types/report-cards';
import {
	listAllEntityPages,
	listAllEntityPagesByIds,
	listAllEntityPagesForIdFilters,
	reportCardResultsForClassPeriod,
	schoolScopedEntityList,
	schoolSubjectsCatalogList,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';
import { fetchClassSubjectsSources } from '$lib/api/subjects-data';
import { teacherNameForClassSubject } from '$lib/api/teacher-display';
import { lang } from '$lib/i18n';
import { catalogBulletinSection, catalogSubjectName } from '$lib/i18n/catalog-label';
import { get } from 'svelte/store';

type GradeScaleRaw = components['schemas']['GradeScale'];
type ReportCardDefinitionRaw = components['schemas']['ReportCardDefinition'];
type ReportCardDefinitionSectionRaw = components['schemas']['ReportCardDefinitionSection'];
type ReportCardResultRaw = components['schemas']['ReportCardResult'];

const REPORT_CARD_CATALOG_SCOPE
	= 'Report-card definitions and grade scales are small configuration catalogs cached in the report-card domain store.';

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

export function derivePassingScore(ranges: GradeScaleRangeRaw[]): number {
	const passingRanges = ranges.filter(range => range.isPassing);
	if (passingRanges.length === 0) {
		return 0;
	}
	return Math.min(...passingRanges.map(range => range.minScore));
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

export function mapGradeScales(scalesRaw: GradeScaleRaw[]): GradeScale[] {
	return scalesRaw.map(scale => ({
		id: scale.id,
		schoolId: scale.schoolId,
		name: scale.name,
		minScore: scale.minScore,
		maxScore: scale.maxScore,
		isDefault: scale.isDefault,
		passingScore: derivePassingScore(scale.ranges),
		decimalPlaces: scale.decimalPlaces ?? 1,
		description: scale.description ?? buildDescriptionFromRanges(scale.ranges),
	}));
}

const SECTION_ROLE_VALUES = new Set<ReportCardSectionKind>(['matieres', 'synthese', 'appreciation']);

export function mapSectionRole(
	section: Pick<ReportCardDefinitionSectionRaw, 'role' | 'name'>,
	hasSubjectChildren: boolean,
): ReportCardSectionKind {
	if (section.role && SECTION_ROLE_VALUES.has(section.role as ReportCardSectionKind)) {
		return section.role as ReportCardSectionKind;
	}
	if (hasSubjectChildren) {
		return 'matieres';
	}
	const normalizedName = section.name.toLowerCase();
	if (normalizedName.includes('appréciation')) {
		return 'appreciation';
	}
	if (normalizedName.includes('synthèse') || normalizedName.includes('moyennes')) {
		return 'synthese';
	}
	return 'matieres';
}

function isSubjectSection(section: Pick<ReportCardDefinitionSectionRaw, 'kind' | 'subjectId'>): boolean {
	return section.kind === 'subject' || Boolean(section.subjectId);
}

function mapDefinitionSection(
	section: ReportCardDefinitionSectionRaw,
	definitionId: string,
	allSections: ReportCardDefinitionSectionRaw[],
	sources: Pick<ClassSubjectsSources, 'subjectsRaw'>,
): ReportCardSection {
	if (isSubjectSection(section)) {
		const subjectId = section.subjectId ?? '';
		const subjectLabel = subjectLabelForCatalogId(subjectId, sources);

		return {
			id: section.id,
			definitionId,
			name: subjectLabel,
			sectionType: 'subject',
			order: section.order,
			coefficient: section.coefficient ?? section.weight,
			subjectId,
			subjectLabel,
		};
	}

	const childSections = allSections
		.filter(child => child.parentSectionId === section.id)
		.sort((left, right) => left.order - right.order);
	const children = childSections.map(child =>
		mapDefinitionSection(child, definitionId, allSections, sources),
	);
	const hasSubjectChildren = childSections.some(isSubjectSection);
	const kind = mapSectionRole(section, hasSubjectChildren);

	return {
		id: section.id,
		definitionId,
		name: catalogBulletinSection(section.name, get(lang)),
		sectionType: 'group',
		kind,
		order: section.order,
		coefficient: section.coefficient ?? (kind === 'matieres' ? section.weight : undefined),
		children: children.length > 0 ? children : undefined,
	};
}

function mapDefinitionSections(
	definitionId: string,
	sectionsRaw: ReportCardDefinitionSectionRaw[],
	sources: Pick<ClassSubjectsSources, 'subjectsRaw'>,
): ReportCardSection[] {
	const definitionSections = sectionsRaw.filter(section => section.reportCardDefinitionId === definitionId);

	return definitionSections
		.filter(section => !section.parentSectionId)
		.sort((left, right) => left.order - right.order)
		.map(section => mapDefinitionSection(section, definitionId, definitionSections, sources));
}

export function mapDefinitionStatus(
	status?: string | null,
): ReportCardPublishStatus {
	return status === 'published' ? 'published' : 'draft';
}

export function mapReportCardDefinitions(
	definitionsRaw: ReportCardDefinitionRaw[],
	sectionsRaw: ReportCardDefinitionSectionRaw[],
	sources: Pick<ClassSubjectsSources, 'subjectsRaw'>,
): ReportCardDefinition[] {
	return definitionsRaw.map(definition => ({
		id: definition.id,
		schoolId: definition.schoolId,
		name: definition.name,
		academicYearId: definition.academicYearId,
		gradeLevelId: definition.gradeLevelId,
		gradeScaleId: definition.gradeScaleId,
		status: mapDefinitionStatus(definition.status),
		sections: mapDefinitionSections(definition.id, sectionsRaw, sources),
	}));
}

interface ApiSectionResult {
	sectionId?: string;
	sectionKind?: string;
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

	return {
		subjectId: classSubjectId,
		subjectName: subject
			? catalogSubjectName(subject.name, get(lang), subject.code)
			: subjectLabelForCatalogId(catalogSubjectId ?? classSubjectId, sources),
		average: subjectResult.average,
		coefficient: subjectResult.weight ?? 1,
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
		sectionAverage: section.average,
		marks: flattenSections([section])
			.map(sub => mapSubjectMark(sub, sources))
			.filter((mark): mark is ReportCardSubjectMark => mark !== null),
	}));
}

export function mapReportCardResults(
	resultsRaw: ReportCardResultRaw[],
	definitions: readonly Pick<
		ReportCardDefinition,
		'id' | 'schoolId' | 'academicYearId' | 'gradeScaleId'
	>[],
	sources: ClassSubjectsSources,
): ReportCardResult[] {
	const definitionById = new Map(definitions.map(definition => [definition.id, definition]));

	return resultsRaw.map((result) => {
		const definition = definitionById.get(result.reportCardDefinitionId);

		return {
			id: result.id,
			schoolId: definition?.schoolId ?? '',
			studentId: result.studentId,
			classId: result.classGroupId,
			definitionId: result.reportCardDefinitionId,
			academicYearId: definition?.academicYearId ?? '2025',
			academicPeriodId: result.periodId,
			gradeScaleId: definition?.gradeScaleId ?? 'gs-20',
			status: mapResultStatus(result.status),
			overallAverage: result.overallAverage ?? undefined,
			classRank: result.rank ?? 0,
			classSize: result.classSize ?? 0,
			sectionResults: mapSectionResults(
				(result.sectionResults ?? []) as ApiSectionResult[],
				sources,
			),
			commentSections: flattenSections((result.sectionResults ?? []) as ApiSectionResult[])
				.filter(section => Boolean(section.sectionId))
				.map(section => ({ sectionId: section.sectionId!, name: section.name ?? section.sectionId!, comment: section.comment ?? '' })),
			version: result.version,
			pendingAssessmentIds: result.pendingAssessmentIds,
			pendingCorrectionIds: result.pendingCorrectionIds,
			calculationStale: result.calculationStale,
			homeroomComment: result.teacherComment ?? undefined,
			principalComment: result.principalComment ?? undefined,
			generatedAt: formatDate(result.generatedAt),
			publishedAt: formatDate(result.publishedAt),
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

export async function loadReportCardCatalogData(
	client: SchoolClient,
	schoolId: string,
): Promise<{
	gradeScales: GradeScale[];
	definitions: ReportCardDefinition[];
}> {
	if (!schoolId) {
		return { gradeScales: [], definitions: [] };
	}
	const catalogQuery = schoolScopedEntityList(schoolId, REPORT_CARD_CATALOG_SCOPE);
	const [gradeScales, definitionsRaw, subjectsRaw] = await Promise.all([
		loadGradeScalesCatalogData(client, schoolId),
		listAllEntityPages(query => client.entities.definitions.list(query), { baseQuery: catalogQuery }),
		safeOptionalEntityList(() => listAllEntityPages(
			query => client.entities.subjects.list(query),
			{ baseQuery: schoolSubjectsCatalogList(schoolId) },
		)),
	]);
	const definitionIds = uniqueIds(definitionsRaw.map(definition => definition.id));
	const sectionsRaw = await listAllEntityPagesForIdFilters(
		query => client.entities.sections.list(query),
		[{ field: 'reportCardDefinitionId', ids: definitionIds }],
	);

	return {
		gradeScales,
		definitions: mapReportCardDefinitions(
			definitionsRaw,
			sectionsRaw,
			{ subjectsRaw: subjectsRaw ?? [] },
		),
	};
}

export async function loadClassReportCardResultsData(
	client: SchoolClient,
	classGroupId: string,
	periodId: string,
	definitions: readonly ReportCardDefinition[],
): Promise<ReportCardResult[]> {
	const [resultsRaw, subjectsSources] = await Promise.all([
		listAllEntityPages(
			query => client.entities.results.list(query),
			{ baseQuery: reportCardResultsForClassPeriod(classGroupId, periodId) },
		),
		fetchClassSubjectsSources(client, classGroupId),
	]);
	const referencedDefinitionIds = uniqueIds(
		resultsRaw.map(result => result.reportCardDefinitionId),
	);
	const missingDefinitionIds = referencedDefinitionIds.filter(
		id => !definitions.some(definition => definition.id === id),
	);
	const missingDefinitionsRaw = await safeOptionalEntityList(() =>
		listAllEntityPagesByIds(query => client.entities.definitions.list(query), missingDefinitionIds),
	);
	const definitionReferences = [
		...definitions,
		...(missingDefinitionsRaw ?? []).map(definition => ({
			id: definition.id,
			schoolId: definition.schoolId,
			academicYearId: definition.academicYearId,
			gradeScaleId: definition.gradeScaleId,
		})),
	];

	return mapReportCardResults(resultsRaw ?? [], definitionReferences, subjectsSources);
}
