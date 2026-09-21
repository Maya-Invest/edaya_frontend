import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type {
	AcademicPeriod,
	AcademicYear,
	AcademicYearStatus,
	ClassNode,
	GradeLevel,
	HierarchyGroup,
	PeriodDefinition,
	School,
} from '$lib/types/school';
import { buildClassHierarchy } from '$lib/academic/hierarchy';
import { paginatedList, schoolScopedEntityList, schoolWideEntityList } from '$lib/api/entity-list-filters';
import { fetchSchoolById, mapSchoolFromApi } from '$lib/api/school-data';
import { ApiError } from '@maya-invest/edaya-api-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

const SHELL_ACADEMIC_STRUCTURE_SCOPE
	= 'Shell bootstrap loads school-wide academic structure selectors (school, years, periods, grade levels, classes).';

export interface AppShellData {
	schools: School[];
	academicYears: AcademicYear[];
	academicPeriods: AcademicPeriod[];
	gradeLevels: GradeLevel[];
	periodDefinitions: PeriodDefinition[];
	classes: ClassNode[];
	hierarchy: HierarchyGroup[];
	studentCount: number;
	guardianCount: number;
	staffCount: number;
	teacherCount: number;
}

interface AppShellCounts {
	activeEnrollmentCountsByClass: Record<string, number>;
	studentCount: number;
	guardianCount: number;
	staffCount: number;
	teacherCount: number;
}

function emptyAppShellCounts(): AppShellCounts {
	return {
		activeEnrollmentCountsByClass: {},
		studentCount: 0,
		guardianCount: 0,
		staffCount: 0,
		teacherCount: 0,
	};
}

function emptyAppShellData(): AppShellData {
	return {
		schools: [],
		academicYears: [],
		academicPeriods: [],
		gradeLevels: [],
		periodDefinitions: [],
		classes: [],
		hierarchy: [],
		studentCount: 0,
		guardianCount: 0,
		staffCount: 0,
		teacherCount: 0,
	};
}

export async function fetchActiveEnrollmentCountsByClass(
	client: SchoolClient,
	classGroupIds: readonly string[],
	schoolId?: string,
): Promise<Record<string, number>> {
	if (classGroupIds.length === 0) {
		return {};
	}

	try {
		const counts = await client.queries.getAppShellCounts({
			schoolId: schoolId ?? '',
			classGroupIds: [...classGroupIds],
		});
		return counts.activeEnrollmentCountsByClass;
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
			return {};
		}
		if (error instanceof TypeError) {
			return {};
		}
		throw error;
	}
}

async function safeAppShellCounts(
	client: SchoolClient,
	schoolId: string,
	classGroupIds: readonly string[],
): Promise<AppShellCounts> {
	try {
		return await client.queries.getAppShellCounts({
			schoolId,
			classGroupIds: [...classGroupIds],
		}) as AppShellCounts;
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
			return emptyAppShellCounts();
		}
		if (error instanceof TypeError) {
			return emptyAppShellCounts();
		}
		throw error;
	}
}

async function safeEntityList<T>(load: () => Promise<T[] | null | undefined>): Promise<T[]> {
	try {
		return (await load()) ?? [];
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
			return [];
		}
		if (error instanceof TypeError) {
			return [];
		}
		throw error;
	}
}

function schoolScopedList(schoolId: string) {
	return paginatedList(schoolScopedEntityList(schoolId), { limit: 50 });
}

const ACADEMIC_YEAR_STATUSES: ReadonlySet<AcademicYearStatus> = new Set(['draft', 'published', 'archived']);

function mapAcademicYearStatus(status: unknown): AcademicYearStatus {
	if (typeof status === 'string' && ACADEMIC_YEAR_STATUSES.has(status as AcademicYearStatus)) {
		return status as AcademicYearStatus;
	}
	return 'draft';
}

function mapAcademicYearFromApi(year: {
	id: string;
	schoolId: string;
	name: string;
	startDate: unknown;
	endDate: unknown;
	status?: unknown;
}): AcademicYear {
	return {
		id: year.id,
		schoolId: year.schoolId,
		label: year.name,
		startDate: typeof year.startDate === 'string' ? year.startDate : String(year.startDate),
		endDate: typeof year.endDate === 'string' ? year.endDate : String(year.endDate),
		status: mapAcademicYearStatus(year.status),
	};
}

async function fetchSupplementalShellForSchool(
	client: SchoolClient,
	schoolId: string,
): Promise<AppShellData | null> {
	const [
		schoolRaw,
		yearsRaw,
		periodsRaw,
		gradeLevelsRaw,
		periodDefsRaw,
		classGroupsRaw,
	] = await Promise.all([
		fetchSchoolById(client, schoolId),
		safeEntityList(() => client.entities.academicYears.list(schoolScopedList(schoolId))),
		safeEntityList(() => client.entities.academicPeriods.list(schoolScopedList(schoolId))),
		safeEntityList(() => client.entities.gradeLevels.list(schoolScopedList(schoolId))),
		safeEntityList(() => client.entities.periodDefinitions.list(schoolScopedList(schoolId))),
		safeEntityList(() => client.entities.classGroups.list(schoolScopedList(schoolId))),
	]);

	if (!schoolRaw && yearsRaw.length === 0 && periodsRaw.length === 0) {
		return null;
	}

	const schools: School[] = schoolRaw?.id && schoolRaw.name
		? [mapSchoolFromApi(schoolRaw)]
		: [];
	const academicYears: AcademicYear[] = (yearsRaw ?? []).map(mapAcademicYearFromApi);
	const periodDefinitions: PeriodDefinition[] = (periodDefsRaw ?? []).map(def => ({
		id: def.id,
		schoolId: def.schoolId,
		academicYearId: def.academicYearId,
		label: def.label,
		dayOfWeek: def.dayOfWeek,
		order: def.order,
		startTime: def.startTime,
		endTime: def.endTime,
		isBreak: def.isBreak ?? false,
		isTeachingSlot: def.isTeachingSlot ?? !def.isBreak,
	}));
	const academicPeriods: AcademicPeriod[] = (periodsRaw ?? []).map((p) => {
		return {
			id: p.id,
			schoolId: p.schoolId,
			academicYearId: p.academicYearId,
			label: p.name,
			range: p.name.includes('1') ? 'Sep — Dec' : p.name.includes('2') ? 'Jan — Apr' : 'May — Jul',
			startDate: typeof p.startDate === 'string' ? p.startDate : String(p.startDate),
			endDate: typeof p.endDate === 'string' ? p.endDate : String(p.endDate),
			status: p.isPublished ? 'published' as const : 'draft' as const,
		};
	});
	const gradeLevels: GradeLevel[] = (gradeLevelsRaw ?? []).map(gl => ({
		id: gl.id,
		schoolId: gl.schoolId,
		name: gl.name,
		label: gl.label,
		cycle: gl.cycle ?? '',
		order: gl.order,
	}));
	const classGroupIds = classGroupsRaw.map(classGroup => classGroup.id);
	const shellCounts = await safeAppShellCounts(client, schoolId, classGroupIds);
	const studentCountByClass = shellCounts.activeEnrollmentCountsByClass;
	const classesList: ClassNode[] = (classGroupsRaw ?? []).map((cg) => {
		const gradeLevel = gradeLevels.find(gl => gl.id === cg.gradeLevelId);
		return {
			id: cg.id,
			schoolId: cg.schoolId,
			academicYearId: cg.academicYearId,
			gradeLevelId: cg.gradeLevelId,
			name: cg.name,
			level: gradeLevel?.cycle ?? '',
			studentCount: studentCountByClass[cg.id] ?? 0,
			capacity: cg.capacity ?? null,
			attendanceMode: cg.attendanceMode ?? 'session',
			homeroomStaffId: cg.homeroomStaffId ?? null,
		};
	});
	const hierarchy = buildClassHierarchy(classesList, gradeLevels);
	const activeStudentCount = Object.values(studentCountByClass).reduce((total, count) => total + count, 0);

	return {
		schools,
		academicYears,
		academicPeriods,
		gradeLevels,
		periodDefinitions,
		classes: classesList,
		hierarchy,
		studentCount: shellCounts.studentCount || activeStudentCount,
		guardianCount: shellCounts.guardianCount,
		staffCount: shellCounts.staffCount,
		teacherCount: shellCounts.teacherCount ?? 0,
	};
}

export interface FetchAppShellDataOptions {
	/** Session school — when set, shell loads are school-scoped (avoids multi-tenant list 403s). */
	fallbackSchoolId?: string | null;
}

export async function fetchAppShellData(
	client: SchoolClient,
	options: FetchAppShellDataOptions = {},
): Promise<AppShellData> {
	// Prefer school-scoped reads when the session already knows its school.
	// Unscoped `{}` lists return every tenant row, then fail ensureEntitiesTenant (403)
	// as soon as the local DB has more than one school (seed + onboarding).
	const scopedSchoolId = options.fallbackSchoolId?.trim() || null;
	if (scopedSchoolId) {
		const scoped = await fetchSupplementalShellForSchool(client, scopedSchoolId);
		return scoped ?? emptyAppShellData();
	}

	const [
		schoolsRaw,
		yearsRaw,
		periodsRaw,
		gradeLevelsRaw,
		periodDefsRaw,
		classGroupsRaw,
	] = await Promise.all([
		safeEntityList(() => client.entities.schools.list(schoolWideEntityList(SHELL_ACADEMIC_STRUCTURE_SCOPE))),
		safeEntityList(() => client.entities.academicYears.list(schoolWideEntityList(SHELL_ACADEMIC_STRUCTURE_SCOPE))),
		safeEntityList(() => client.entities.academicPeriods.list(schoolWideEntityList(SHELL_ACADEMIC_STRUCTURE_SCOPE))),
		safeEntityList(() => client.entities.gradeLevels.list(schoolWideEntityList(SHELL_ACADEMIC_STRUCTURE_SCOPE))),
		safeEntityList(() => client.entities.periodDefinitions.list(schoolWideEntityList(SHELL_ACADEMIC_STRUCTURE_SCOPE))),
		safeEntityList(() => client.entities.classGroups.list(schoolWideEntityList(SHELL_ACADEMIC_STRUCTURE_SCOPE))),
	]);

	const classGroupIds = (classGroupsRaw ?? []).map(classGroup => classGroup.id);
	const schoolId = (schoolsRaw ?? []).find(school => school?.id)?.id ?? '';
	const shellCounts = schoolId
		? await safeAppShellCounts(client, schoolId, classGroupIds)
		: emptyAppShellCounts();
	const studentCountByClass = shellCounts.activeEnrollmentCountsByClass;

	const schools: School[] = (schoolsRaw ?? [])
		.filter((school): school is NonNullable<typeof schoolsRaw[number]> & { id: string; name: string } =>
			Boolean(school?.id && school?.name))
		.map(s => mapSchoolFromApi(s));

	const academicYears: AcademicYear[] = (yearsRaw ?? []).map(mapAcademicYearFromApi);

	const periodDefinitions: PeriodDefinition[] = (periodDefsRaw ?? []).map(def => ({
		id: def.id,
		schoolId: def.schoolId,
		academicYearId: def.academicYearId,
		label: def.label,
		dayOfWeek: def.dayOfWeek,
		order: def.order,
		startTime: def.startTime,
		endTime: def.endTime,
		isBreak: def.isBreak ?? false,
		isTeachingSlot: def.isTeachingSlot ?? !def.isBreak,
	}));

	const academicPeriods: AcademicPeriod[] = (periodsRaw ?? []).map((p) => {
		return {
			id: p.id,
			schoolId: p.schoolId,
			academicYearId: p.academicYearId,
			label: p.name,
			range: p.name.includes('1') ? 'Sep — Dec' : p.name.includes('2') ? 'Jan — Apr' : 'May — Jul',
			startDate: typeof p.startDate === 'string' ? p.startDate : String(p.startDate),
			endDate: typeof p.endDate === 'string' ? p.endDate : String(p.endDate),
			status: p.isPublished ? 'published' as const : 'draft' as const,
		};
	});

	const gradeLevels: GradeLevel[] = (gradeLevelsRaw ?? []).map(gl => ({
		id: gl.id,
		schoolId: gl.schoolId,
		name: gl.name,
		label: gl.label,
		cycle: gl.cycle ?? '',
		order: gl.order,
	}));

	const classesList: ClassNode[] = (classGroupsRaw ?? []).map((cg) => {
		const gradeLevel = gradeLevels.find(gl => gl.id === cg.gradeLevelId);
		return {
			id: cg.id,
			schoolId: cg.schoolId,
			academicYearId: cg.academicYearId,
			gradeLevelId: cg.gradeLevelId,
			name: cg.name,
			level: gradeLevel?.cycle ?? '',
			studentCount: studentCountByClass[cg.id] ?? 0,
			capacity: cg.capacity ?? null,
			attendanceMode: cg.attendanceMode ?? 'session',
			homeroomStaffId: cg.homeroomStaffId ?? null,
		};
	});

	const hierarchy = buildClassHierarchy(classesList, gradeLevels);
	const activeStudentCount = Object.values(studentCountByClass).reduce((total, count) => total + count, 0);

	return {
		schools,
		academicYears,
		academicPeriods,
		gradeLevels,
		periodDefinitions,
		classes: classesList,
		hierarchy,
		studentCount: shellCounts.studentCount || activeStudentCount,
		guardianCount: shellCounts.guardianCount,
		staffCount: shellCounts.staffCount,
		teacherCount: shellCounts.teacherCount ?? 0,
	};
}
