import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type {
	AcademicPeriod,
	AcademicYear,
	ClassNode,
	GradeLevel,
	HierarchyGroup,
	PeriodDefinition,
	School,
} from '$lib/types/school';
import { ApiError } from '$api-client';
import { buildClassHierarchy } from '$lib/academic/hierarchy';
import { activeEnrollmentCountForClass, schoolWideEntityList } from '$lib/api/entity-list-filters';
import { mapSchoolFromApi } from '$lib/api/school-data';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

const SHELL_ACADEMIC_STRUCTURE_SCOPE
	= 'Shell bootstrap loads school-wide academic structure selectors (school, years, periods, grade levels, classes).';

const SHELL_SIDEBAR_COUNTS_SCOPE
	= 'Shell bootstrap loads school-wide people counts for sidebar navigation badges.';

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
}

export async function fetchActiveEnrollmentCountsByClass(
	client: SchoolClient,
	classGroupIds: readonly string[],
): Promise<Record<string, number>> {
	if (classGroupIds.length === 0) {
		return {};
	}

	const entries = await Promise.all(classGroupIds.map(async (classGroupId) => {
		const count = await safeEntityCount(() =>
			client.entities.enrollments.count(activeEnrollmentCountForClass(classGroupId)),
		);
		return [classGroupId, count] as const;
	}));

	return Object.fromEntries(entries);
}

async function safeEntityCount(load: () => Promise<{ count: number }>): Promise<number> {
	try {
		return (await load()).count;
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
			return 0;
		}
		throw error;
	}
}

export async function fetchAppShellData(client: SchoolClient): Promise<AppShellData> {
	const [
		schoolsRaw,
		yearsRaw,
		periodsRaw,
		gradeLevelsRaw,
		periodDefsRaw,
		classGroupsRaw,
	] = await Promise.all([
		client.entities.schools.list(schoolWideEntityList(SHELL_ACADEMIC_STRUCTURE_SCOPE)),
		client.entities.academicYears.list(schoolWideEntityList(SHELL_ACADEMIC_STRUCTURE_SCOPE)),
		client.entities.academicPeriods.list(schoolWideEntityList(SHELL_ACADEMIC_STRUCTURE_SCOPE)),
		client.entities.gradeLevels.list(schoolWideEntityList(SHELL_ACADEMIC_STRUCTURE_SCOPE)),
		client.entities.periodDefinitions.list(schoolWideEntityList(SHELL_ACADEMIC_STRUCTURE_SCOPE)),
		client.entities.classGroups.list(schoolWideEntityList(SHELL_ACADEMIC_STRUCTURE_SCOPE)),
	]);

	const studentCountByClass = await fetchActiveEnrollmentCountsByClass(
		client,
		(classGroupsRaw ?? []).map(classGroup => classGroup.id),
	);

	const schools: School[] = (schoolsRaw ?? [])
		.filter((school): school is NonNullable<typeof schoolsRaw[number]> & { id: string; name: string } =>
			Boolean(school?.id && school?.name))
		.map(s => mapSchoolFromApi(s));

	const academicYears: AcademicYear[] = (yearsRaw ?? []).map(y => ({
		id: y.id,
		schoolId: y.schoolId,
		label: y.name,
		startDate: typeof y.startDate === 'string' ? y.startDate : String(y.startDate),
		endDate: typeof y.endDate === 'string' ? y.endDate : String(y.endDate),
		status: y.isActive ? 'published' as const : 'draft' as const,
	}));

	const periodDefinitions: PeriodDefinition[] = (periodDefsRaw ?? []).map(def => ({
		id: def.id,
		schoolId: def.schoolId,
		name: def.label,
		order: def.order,
	}));

	const academicPeriods: AcademicPeriod[] = (periodsRaw ?? []).map((p) => {
		const matchDef = periodDefinitions.find(def => def.name === p.name);
		return {
			id: p.id,
			schoolId: p.schoolId,
			academicYearId: p.academicYearId,
			periodDefinitionId: matchDef?.id ?? `def-${p.id}`,
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

	const schoolId = schools[0]?.id ?? '';
	const [rosterStudentCount, guardianCount, staffCount] = await Promise.all([
		safeEntityCount(() => client.entities.students.count(schoolWideEntityList(SHELL_SIDEBAR_COUNTS_SCOPE))),
		safeEntityCount(() => client.entities.guardians.count(schoolWideEntityList(SHELL_SIDEBAR_COUNTS_SCOPE))),
		schoolId
			? safeEntityCount(() => client.entities.staffMembers.count({ schoolId }))
			: Promise.resolve(0),
	]);

	return {
		schools,
		academicYears,
		academicPeriods,
		gradeLevels,
		periodDefinitions,
		classes: classesList,
		hierarchy,
		studentCount: rosterStudentCount || activeStudentCount,
		guardianCount,
		staffCount,
	};
}
