import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Guardian, Student } from '$lib/types/school';
import type { EntityQuery } from '@maya-invest/edaya-api-client';
import {
	activeEnrollmentsForClass,
	assessmentResultsForScope,
	assessmentResultsForStudents,
	assessmentsForClassPeriod,
	attendanceForStudents,
	DEFAULT_LIST_PAGE_SIZE,
	entitiesByIds,
	enrollmentsForStudents,
	GUARDIAN_LIST_ORDER,
	guardianLinksForGuardians,
	guardianLinksForStudents,
	guardiansByIds,
	listAllEntityPages,
	paginatedList,
	schoolScopedEntityList,
	ENROLLMENT_LIST_ORDER,
	STUDENT_LIST_ORDER,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import { formatDateInput } from '$lib/date/format';
import { ApiError } from '@maya-invest/edaya-api-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

const SCHOOL_ROSTER_SCOPE
	= 'School students administration route loads paginated school roster data.';

const SCHOOL_GUARDIANS_SCOPE
	= 'School guardians administration lists all guardians; only guardian-linked students and enrollments are fetched by id.';

type StudentRaw = components['schemas']['Student'];
type EnrollmentRaw = components['schemas']['StudentClassEnrollment'];
type GuardianRaw = components['schemas']['Guardian'];
type GuardianLinkRaw = components['schemas']['GuardianStudentLink'];
type AttendanceRaw = components['schemas']['Attendance'];
type AssessmentRaw = components['schemas']['Assessment'];
type AssessmentResultRaw = components['schemas']['AssessmentResult'];

export interface PeopleSources {
	studentsRaw: StudentRaw[];
	enrollmentsRaw: EnrollmentRaw[];
	guardiansRaw: GuardianRaw[];
	linksRaw: GuardianLinkRaw[];
}

export interface StudentMetricsSources {
	attendanceRaw: AttendanceRaw[];
	assessmentsRaw: AssessmentRaw[];
	resultsRaw: AssessmentResultRaw[];
}

export interface PeopleData {
	students: Student[];
	guardians: Guardian[];
}

export interface PaginatedPeopleData extends PeopleData {
	totalStudents: number;
}

export interface PaginatedGuardiansData extends PeopleData {
	totalGuardians: number;
}

interface PaginatedPeopleSourcesWithMetrics extends PeopleSources {
	totalStudents: number;
	metrics: StudentMetricsSources;
}

export interface PeoplePageRequest {
	schoolId: string;
	offset?: number;
	limit?: number;
	classGroupId?: string;
}

function emptyStudentMetricsSources(): StudentMetricsSources {
	return {
		attendanceRaw: [],
		assessmentsRaw: [],
		resultsRaw: [],
	};
}

function initialsFor(firstName: string, lastName: string): string {
	return `${firstName[0] ?? ''}${lastName[0] ?? ''}`;
}

function mapGuardianRelation(link: GuardianLinkRaw | undefined): string {
	if (!link) {
		return 'Legal guardian';
	}

	const relationship = link.relationship?.trim();
	if (relationship) {
		return relationship;
	}

	if (link.legalGuardian) {
		return 'Legal guardian';
	}

	return 'Guardian';
}

function mapPreferredContact(guardian: GuardianRaw): Guardian['preferredContact'] {
	const primary = guardian.contactMethods.find(method => method.isPrimary)
		?? guardian.contactMethods[0];

	if (primary?.type === 'sms') {
		return 'sms';
	}
	if (primary?.type === 'phone' || primary?.type === 'whatsapp') {
		return 'phone';
	}
	if (guardian.email || primary?.type === 'email') {
		return 'email';
	}
	if (guardian.phone) {
		return 'phone';
	}

	return 'phone';
}

function guardianDisplayName(
	guardian: GuardianRaw | null | undefined,
): string {
	if (!guardian) {
		return 'Non renseigné';
	}

	return `${guardian.firstName} ${guardian.lastName}`;
}

function computeAttendancePercent(studentId: string, attendanceRaw: AttendanceRaw[]): number | null {
	const records = attendanceRaw.filter(record => record.studentId === studentId);
	if (records.length === 0) {
		return null;
	}

	const attended = records.filter(record => record.status === 'present' || record.status === 'late').length;
	return Math.round((attended / records.length) * 1000) / 10;
}

function computeStudentAverage(
	studentId: string,
	resultsRaw: AssessmentResultRaw[],
	assessmentsById: Map<string, AssessmentRaw>,
): number {
	let weightedSum = 0;
	let totalCoefficient = 0;

	for (const result of resultsRaw) {
		if (result.studentId !== studentId || typeof result.score !== 'number') {
			continue;
		}

		const assessment = assessmentsById.get(result.assessmentId);
		if (!assessment) {
			continue;
		}

		const coefficient = assessment.coefficient ?? 1;
		const maxScore = assessment.maxScore > 0 ? assessment.maxScore : 20;
		const normalized = (result.score / maxScore) * 20;
		weightedSum += normalized * coefficient;
		totalCoefficient += coefficient;
	}

	if (totalCoefficient === 0) {
		return 0;
	}

	return Math.round((weightedSum / totalCoefficient) * 10) / 10;
}

function mapStudentAcademicBadge(average: number): Student['academicBadge'] {
	if (average >= 16) {
		return 'honor';
	}
	if (average > 0 && average < 10) {
		return 'warning';
	}
	return null;
}

function mapStudentApiStatus(status: StudentRaw['status']): Student['status'] {
	if (status === 'inactive' || status === 'archived') {
		return status;
	}
	return 'active';
}

async function listRosterPages<T>(
	list: (query: EntityQuery) => Promise<T[] | null | undefined>,
	baseQuery: EntityQuery,
): Promise<T[]> {
	return listAllEntityPages(query => list(query), { baseQuery });
}

export async function fetchPeopleSources(client: SchoolClient, schoolId: string): Promise<PeopleSources> {
	const studentsRaw = await listRosterPages(
		query => client.entities.students.list(query),
		{
			...schoolScopedEntityList(schoolId, SCHOOL_ROSTER_SCOPE),
			$orderBy: STUDENT_LIST_ORDER,
		},
	);
	const studentIds = uniqueIds(studentsRaw.map(student => student.id));
	if (studentIds.length === 0) {
		return {
			studentsRaw,
			enrollmentsRaw: [],
			guardiansRaw: [],
			linksRaw: [],
		};
	}

	const [enrollmentsRaw, linksRaw] = await Promise.all([
		listRosterPages(
			query => client.entities.enrollments.list(query),
			enrollmentsForStudents(studentIds),
		),
		listRosterPages(
			query => client.entities.guardianLinks.list(query),
			guardianLinksForStudents(studentIds),
		),
	]);
	const guardianIds = uniqueIds(linksRaw.map(link => link.guardianId));
	const guardiansRaw = guardianIds.length > 0
		? await listRosterPages(
				query => client.entities.guardians.list(query),
				guardiansByIds(guardianIds),
			)
		: [];

	return {
		studentsRaw,
		enrollmentsRaw,
		guardiansRaw,
		linksRaw,
	};
}

async function fetchPeopleSourcesPageWithMetrics(
	client: SchoolClient,
	request: PeoplePageRequest,
): Promise<PaginatedPeopleSourcesWithMetrics> {
	if (request.classGroupId) {
		return fetchClassPeopleSourcesPageWithMetrics(client, request.classGroupId, request);
	}

	const limit = request.limit ?? DEFAULT_LIST_PAGE_SIZE;
	const offset = request.offset ?? 0;
	const rosterScope = schoolScopedEntityList(request.schoolId, SCHOOL_ROSTER_SCOPE);
	const studentFilter = paginatedList(rosterScope, {
		limit,
		offset,
		orderBy: STUDENT_LIST_ORDER,
	});

	const [studentsRaw, totalStudents] = await Promise.all([
		client.entities.students.list(studentFilter),
		client.entities.students.count(rosterScope).then(result => result.count),
	]);

	const studentIds = uniqueIds((studentsRaw ?? []).map(student => student.id));
	if (studentIds.length === 0) {
		return {
			studentsRaw: [],
			enrollmentsRaw: [],
			guardiansRaw: [],
			linksRaw: [],
			totalStudents,
			metrics: emptyStudentMetricsSources(),
		};
	}

	const enrollmentsPromise = client.entities.enrollments.list(enrollmentsForStudents(studentIds));
	const linksPromise = client.entities.guardianLinks.list(guardianLinksForStudents(studentIds));
	const guardiansPromise = linksPromise.then((linksRaw) => {
		const guardianIds = uniqueIds((linksRaw ?? []).map(link => link.guardianId));
		return guardianIds.length > 0
			? client.entities.guardians.list(guardiansByIds(guardianIds))
			: Promise.resolve([]);
	});
	const metricsPromise = fetchStudentMetricsSources(client, studentIds);

	const [enrollmentsRaw, linksRaw, guardiansRaw, metrics] = await Promise.all([
		enrollmentsPromise,
		linksPromise,
		guardiansPromise,
		metricsPromise,
	]);

	return {
		studentsRaw: studentsRaw ?? [],
		enrollmentsRaw,
		guardiansRaw: guardiansRaw ?? [],
		linksRaw: linksRaw ?? [],
		totalStudents,
		metrics,
	};
}

async function fetchClassPeopleSourcesPageWithMetrics(
	client: SchoolClient,
	classGroupId: string,
	request: Pick<PeoplePageRequest, 'limit' | 'offset'> = {},
): Promise<PaginatedPeopleSourcesWithMetrics> {
	const limit = request.limit ?? DEFAULT_LIST_PAGE_SIZE;
	const offset = request.offset ?? 0;
	const enrollmentScope = activeEnrollmentsForClass(classGroupId);
	const enrollmentFilter = paginatedList(enrollmentScope, {
		limit,
		offset,
		orderBy: ENROLLMENT_LIST_ORDER,
	});

	const [enrollmentsRaw, totalStudents] = await Promise.all([
		client.entities.enrollments.list(enrollmentFilter),
		client.entities.enrollments.count(enrollmentScope).then(result => result.count),
	]);

	const studentIds = uniqueIds((enrollmentsRaw ?? []).map(enrollment => enrollment.studentId));
	if (studentIds.length === 0) {
		return {
			studentsRaw: [],
			enrollmentsRaw: enrollmentsRaw ?? [],
			guardiansRaw: [],
			linksRaw: [],
			totalStudents,
			metrics: emptyStudentMetricsSources(),
		};
	}

	const linksPromise = client.entities.guardianLinks.list(guardianLinksForStudents(studentIds));
	const guardiansPromise = linksPromise.then((linksRaw) => {
		const guardianIds = uniqueIds((linksRaw ?? []).map(link => link.guardianId));
		return guardianIds.length > 0
			? client.entities.guardians.list(guardiansByIds(guardianIds))
			: Promise.resolve([]);
	});
	const metricsPromise = fetchStudentMetricsSources(client, studentIds);

	const [studentsRaw, linksRaw, guardiansRaw, metrics] = await Promise.all([
		client.entities.students.list(entitiesByIds(studentIds)),
		linksPromise,
		guardiansPromise,
		metricsPromise,
	]);

	return {
		studentsRaw: studentsRaw ?? [],
		enrollmentsRaw: enrollmentsRaw ?? [],
		guardiansRaw: guardiansRaw ?? [],
		linksRaw: linksRaw ?? [],
		totalStudents,
		metrics,
	};
}

export async function fetchPeopleSourcesPage(
	client: SchoolClient,
	request: PeoplePageRequest,
): Promise<PeopleSources & { totalStudents: number }> {
	const sources = await fetchPeopleSourcesPageWithMetrics(client, request);
	return {
		studentsRaw: sources.studentsRaw,
		enrollmentsRaw: sources.enrollmentsRaw,
		guardiansRaw: sources.guardiansRaw,
		linksRaw: sources.linksRaw,
		totalStudents: sources.totalStudents,
	};
}

export async function fetchGuardiansPeopleSourcesPage(
	client: SchoolClient,
	request: PeoplePageRequest,
): Promise<PeopleSources & { totalGuardians: number }> {
	const limit = request.limit ?? DEFAULT_LIST_PAGE_SIZE;
	const offset = request.offset ?? 0;
	const guardiansScope = schoolScopedEntityList(request.schoolId, SCHOOL_GUARDIANS_SCOPE);
	const guardianFilter = paginatedList(guardiansScope, {
		limit,
		offset,
		orderBy: GUARDIAN_LIST_ORDER,
	});

	const [guardiansRaw, totalGuardians] = await Promise.all([
		client.entities.guardians.list(guardianFilter),
		client.entities.guardians.count(guardiansScope).then(result => result.count),
	]);
	const guardianIds = uniqueIds((guardiansRaw ?? []).map(guardian => guardian.id));

	if (guardianIds.length === 0) {
		return {
			studentsRaw: [],
			enrollmentsRaw: [],
			guardiansRaw: guardiansRaw ?? [],
			linksRaw: [],
			totalGuardians,
		};
	}

	const linksRaw = (await client.entities.guardianLinks.list(
		guardianLinksForGuardians(guardianIds),
	)) ?? [];
	const studentIds = uniqueIds(linksRaw.map(link => link.studentId));

	if (studentIds.length === 0) {
		return {
			studentsRaw: [],
			enrollmentsRaw: [],
			guardiansRaw: guardiansRaw ?? [],
			linksRaw,
			totalGuardians,
		};
	}

	const [studentsRaw, enrollmentsRaw] = await Promise.all([
		client.entities.students.list(entitiesByIds(studentIds)),
		client.entities.enrollments.list(enrollmentsForStudents(studentIds)),
	]);

	return {
		studentsRaw: studentsRaw ?? [],
		enrollmentsRaw: enrollmentsRaw ?? [],
		guardiansRaw: guardiansRaw ?? [],
		linksRaw,
		totalGuardians,
	};
}

export async function fetchGuardiansPeopleSources(client: SchoolClient, schoolId: string): Promise<PeopleSources> {
	const guardiansRaw = (await client.entities.guardians.list(
		schoolScopedEntityList(schoolId, SCHOOL_GUARDIANS_SCOPE),
	)) ?? [];
	const guardianIds = uniqueIds(guardiansRaw.map(guardian => guardian.id));

	if (guardianIds.length === 0) {
		return {
			studentsRaw: [],
			enrollmentsRaw: [],
			guardiansRaw,
			linksRaw: [],
		};
	}

	const linksRaw = (await client.entities.guardianLinks.list(
		guardianLinksForGuardians(guardianIds),
	)) ?? [];
	const studentIds = uniqueIds(linksRaw.map(link => link.studentId));

	if (studentIds.length === 0) {
		return {
			studentsRaw: [],
			enrollmentsRaw: [],
			guardiansRaw,
			linksRaw,
		};
	}

	const [
		studentsRaw,
		enrollmentsRaw,
	] = await Promise.all([
		client.entities.students.list(entitiesByIds(studentIds)),
		client.entities.enrollments.list(enrollmentsForStudents(studentIds)),
	]);

	return {
		studentsRaw: studentsRaw ?? [],
		enrollmentsRaw: enrollmentsRaw ?? [],
		guardiansRaw,
		linksRaw,
	};
}

export async function fetchClassPeopleSources(
	client: SchoolClient,
	classGroupId: string,
): Promise<PeopleSources> {
	const enrollmentsRaw = (await client.entities.enrollments.list(
		activeEnrollmentsForClass(classGroupId),
	)) ?? [];
	const studentIds = uniqueIds(enrollmentsRaw.map(enrollment => enrollment.studentId));

	if (studentIds.length === 0) {
		return {
			studentsRaw: [],
			enrollmentsRaw,
			guardiansRaw: [],
			linksRaw: [],
		};
	}

	const [
		studentsRaw,
		linksRaw,
	] = await Promise.all([
		client.entities.students.list(entitiesByIds(studentIds)),
		client.entities.guardianLinks.list(guardianLinksForStudents(studentIds)),
	]);

	const guardianIds = uniqueIds((linksRaw ?? []).map(link => link.guardianId));
	const guardiansRaw = guardianIds.length > 0
		? await client.entities.guardians.list(guardiansByIds(guardianIds))
		: [];

	return {
		studentsRaw: studentsRaw ?? [],
		enrollmentsRaw,
		guardiansRaw: guardiansRaw ?? [],
		linksRaw: linksRaw ?? [],
	};
}

async function fetchClassRosterMetricsSources(
	client: SchoolClient,
	studentIds: readonly string[],
	classScope: { classGroupId: string; periodId: string },
): Promise<StudentMetricsSources> {
	const [attendanceRaw, assessmentsRaw] = await Promise.all([
		client.entities.attendance.list(attendanceForStudents(studentIds)),
		client.entities.assessments.list(
			assessmentsForClassPeriod(classScope.classGroupId, classScope.periodId),
		),
	]);
	const assessmentIds = uniqueIds((assessmentsRaw ?? []).map(assessment => assessment.id));
	const resultsRaw = assessmentIds.length > 0
		? await client.entities.assessmentResults.list(
				assessmentResultsForScope(assessmentIds, studentIds),
			)
		: [];

	return {
		attendanceRaw: attendanceRaw ?? [],
		assessmentsRaw: assessmentsRaw ?? [],
		resultsRaw: resultsRaw ?? [],
	};
}

async function fetchSchoolRosterMetricsSources(
	client: SchoolClient,
	studentIds: readonly string[],
): Promise<StudentMetricsSources> {
	const [attendanceRaw, resultsRaw] = await Promise.all([
		client.entities.attendance.list(attendanceForStudents(studentIds)),
		client.entities.assessmentResults.list(assessmentResultsForStudents(studentIds)),
	]);
	const assessmentIds = uniqueIds((resultsRaw ?? []).map(result => result.assessmentId));
	const assessmentsRaw = assessmentIds.length > 0
		? await client.entities.assessments.list(entitiesByIds(assessmentIds))
		: [];

	return {
		attendanceRaw: attendanceRaw ?? [],
		assessmentsRaw: assessmentsRaw ?? [],
		resultsRaw: resultsRaw ?? [],
	};
}

async function fetchStudentMetricsSources(
	client: SchoolClient,
	studentIds: readonly string[],
	classScope?: { classGroupId: string; periodId: string },
): Promise<StudentMetricsSources> {
	if (studentIds.length === 0) {
		return emptyStudentMetricsSources();
	}

	if (classScope) {
		return fetchClassRosterMetricsSources(client, studentIds, classScope);
	}

	return fetchSchoolRosterMetricsSources(client, studentIds);
}

export function mapPeopleData(
	sources: PeopleSources,
	metrics: StudentMetricsSources = {
		attendanceRaw: [],
		assessmentsRaw: [],
		resultsRaw: [],
	},
): PeopleData {
	const guardians = mapGuardians(sources.guardiansRaw, sources.linksRaw);
	const students = mapStudents(sources, metrics);

	return { students, guardians };
}

export function mapStudents(
	sources: PeopleSources,
	metrics: StudentMetricsSources = {
		attendanceRaw: [],
		assessmentsRaw: [],
		resultsRaw: [],
	},
): Student[] {
	const { studentsRaw, enrollmentsRaw, guardiansRaw, linksRaw } = sources;
	const assessmentsById = new Map(metrics.assessmentsRaw.map(assessment => [assessment.id, assessment]));

	return studentsRaw.map((student) => {
		const activeEnrollment = enrollmentsRaw.find(
			enrollment => enrollment.studentId === student.id && enrollment.status === 'active',
		);
		const classId = activeEnrollment?.classGroupId ?? '';
		const link = linksRaw.find(entry => entry.studentId === student.id);
		const guardian = link
			? guardiansRaw.find(entry => entry.id === link.guardianId)
			: null;
		const average = computeStudentAverage(student.id, metrics.resultsRaw, assessmentsById);

		return {
			id: student.id,
			classId,
			enrollmentId: activeEnrollment?.id,
			name: `${student.firstName} ${student.lastName}`,
			initials: initialsFor(student.firstName, student.lastName),
			photoUrl: student.photoUrl ?? null,
			photoAttachmentId: student.photoAttachmentId ?? null,
			email: '',
			birthdate: formatDateInput(student.birthDate),
			matricule: student.matricule ?? null,
			gender: student.gender ?? null,
			guardian: guardianDisplayName(guardian),
			attendance: computeAttendancePercent(student.id, metrics.attendanceRaw),
			average,
			status: mapStudentApiStatus(student.status),
			academicBadge: mapStudentAcademicBadge(average),
			subjectId: student.subjectId ?? null,
		};
	});
}

export function mapGuardians(
	guardiansRaw: GuardianRaw[],
	linksRaw: GuardianLinkRaw[],
): Guardian[] {
	return guardiansRaw.map((guardian) => {
		const guardianLinks = linksRaw.filter(link => link.guardianId === guardian.id);
		const primaryLink = guardianLinks.find(link => link.isPrimary) ?? guardianLinks[0];
		const email = guardian.email
			?? guardian.contactMethods.find(method => method.type === 'email')?.value
			?? '';
		const phone = guardian.phone
			?? guardian.contactMethods.find(method => method.type === 'phone' || method.type === 'whatsapp')?.value
			?? '';

		return {
			id: guardian.id,
			name: `${guardian.firstName} ${guardian.lastName}`,
			initials: initialsFor(guardian.firstName, guardian.lastName),
			photoUrl: guardian.photoUrl ?? null,
			relation: mapGuardianRelation(primaryLink),
			email,
			phone,
			studentIds: guardianLinks.map(link => link.studentId),
			preferredContact: mapPreferredContact(guardian),
			subjectId: guardian.subjectId ?? null,
		};
	});
}

export async function loadPeopleData(client: SchoolClient, schoolId: string): Promise<PeopleData> {
	const sources = await fetchPeopleSources(client, schoolId);
	const studentIds = uniqueIds(sources.studentsRaw.map(student => student.id));
	const metrics = await fetchStudentMetricsSources(client, studentIds);
	return mapPeopleData(sources, metrics);
}

export async function loadPeopleDataPage(
	client: SchoolClient,
	request: PeoplePageRequest,
): Promise<PaginatedPeopleData> {
	const sources = await fetchPeopleSourcesPageWithMetrics(client, request);
	const { metrics } = sources;
	const data = mapPeopleData(sources, metrics);
	return { ...data, totalStudents: sources.totalStudents };
}

export async function loadGuardiansPeopleData(client: SchoolClient, schoolId: string): Promise<PeopleData> {
	const sources = await fetchGuardiansPeopleSources(client, schoolId);
	return mapPeopleData(sources);
}

export async function loadGuardiansPeopleDataPage(
	client: SchoolClient,
	request: PeoplePageRequest,
): Promise<PaginatedGuardiansData> {
	const sources = await fetchGuardiansPeopleSourcesPage(client, request);
	const data = mapPeopleData(sources);
	return { ...data, totalGuardians: sources.totalGuardians };
}

export async function loadClassPeopleData(
	client: SchoolClient,
	classGroupId: string,
	periodId: string,
): Promise<PeopleData> {
	const sources = await fetchClassPeopleSources(client, classGroupId);
	const studentIds = uniqueIds(sources.studentsRaw.map(student => student.id));
	const metrics = await fetchStudentMetricsSources(client, studentIds, { classGroupId, periodId });
	return mapPeopleData(sources, metrics);
}

function isMissingEntityError(error: unknown): boolean {
	return error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404);
}

export async function fetchStudentById(
	client: SchoolClient,
	studentId: string,
): Promise<Student | null> {
	try {
		const studentsRaw = await client.entities.students.list(entitiesByIds([studentId]));
		const studentRaw = studentsRaw?.[0];
		if (!studentRaw) {
			return null;
		}

		const [enrollmentsRaw, linksRaw] = await Promise.all([
			client.entities.enrollments.list(enrollmentsForStudents([studentId])),
			client.entities.guardianLinks.list(guardianLinksForStudents([studentId])),
		]);
		const guardianIds = uniqueIds((linksRaw ?? []).map(link => link.guardianId));
		const guardiansRaw = guardianIds.length > 0
			? await client.entities.guardians.list(guardiansByIds(guardianIds))
			: [];
		let metrics: StudentMetricsSources = {
			attendanceRaw: [],
			assessmentsRaw: [],
			resultsRaw: [],
		};
		try {
			metrics = await fetchStudentMetricsSources(client, [studentId]);
		}
		catch (error) {
			if (!isMissingEntityError(error)) {
				throw error;
			}
		}
		const sources: PeopleSources = {
			studentsRaw: [studentRaw],
			enrollmentsRaw: enrollmentsRaw ?? [],
			guardiansRaw: guardiansRaw ?? [],
			linksRaw: linksRaw ?? [],
		};
		return mapStudents(sources, metrics)[0] ?? null;
	}
	catch (error) {
		if (isMissingEntityError(error)) {
			return null;
		}
		throw error;
	}
}

export async function fetchGuardianById(
	client: SchoolClient,
	guardianId: string,
): Promise<Guardian | null> {
	try {
		const guardianRaw = await client.entities.guardians.get(guardianId);
		const linksRaw = await client.entities.guardianLinks.list(
			guardianLinksForGuardians([guardianId]),
		);
		return mapGuardians([guardianRaw], linksRaw ?? [])[0] ?? null;
	}
	catch (error) {
		if (isMissingEntityError(error)) {
			return null;
		}
		throw error;
	}
}
