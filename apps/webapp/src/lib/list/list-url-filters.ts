import { defineUrlFilterCodec } from './url-filter-codec.ts';

const calendarListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	type: { type: 'string', default: 'all' },
});

const configSubjectListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	gradeLevel: { type: 'string', default: 'all' },
});

const teachingListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
});

const planningListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	week: { type: 'string', default: '' },
});

const classStudentListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	status: { type: 'string', default: 'all' },
});

const activityListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	category: { type: 'string', default: 'all' },
	sort: { type: 'enum', default: 'roster', values: ['roster', 'name', 'category', 'coach', 'period', 'enrolled'] as const },
	sortDir: { type: 'enum', default: 'asc', values: ['asc', 'desc'] as const },
});

const announcementListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	status: { type: 'string', default: 'all' },
});

const familyFeedbackListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	status: { type: 'string', default: 'all' },
});

const studentListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	class: { type: 'string', default: 'all' },
	status: { type: 'string', default: 'all' },
	photoReview: { type: 'enum', default: 'all', values: ['all', 'pending'] as const },
	sort: { type: 'enum', default: 'roster', values: ['roster', 'name', 'class', 'average', 'attendance', 'status'] as const },
	sortDir: { type: 'enum', default: 'asc', values: ['asc', 'desc'] as const },
});

const guardianListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	sort: { type: 'enum', default: 'roster', values: ['roster', 'name', 'relation', 'phone', 'students'] as const },
	sortDir: { type: 'enum', default: 'asc', values: ['asc', 'desc'] as const },
});

const staffListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	sort: { type: 'enum', default: 'roster', values: ['roster', 'name', 'role', 'classes'] as const },
	sortDir: { type: 'enum', default: 'asc', values: ['asc', 'desc'] as const },
});

const teacherListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	sort: { type: 'enum', default: 'roster', values: ['roster', 'name', 'assignments', 'status'] as const },
	sortDir: { type: 'enum', default: 'asc', values: ['asc', 'desc'] as const },
});

const classReportCardListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	status: { type: 'string', default: 'all' },
});

const paymentListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	status: { type: 'string', default: 'all' },
	class: { type: 'string', default: 'all' },
});

const reportCardDefinitionListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	status: { type: 'string', default: 'all' },
});

const roleListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
});

const gradeScaleListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
});

const feeListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	category: { type: 'string', default: 'all' },
});

const classGroupListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
});

const academicAdminListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	status: { type: 'string', default: 'all' },
});

const disciplineCatalogListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	kind: { type: 'string', default: 'all' },
});

const permissionProfileListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	grain: { type: 'string', default: 'all' },
});

const resourceListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	status: { type: 'string', default: 'all' },
});

const educatorDashboardListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	tab: { type: 'enum', default: 'schoollife', values: ['schoollife', 'grades'] as const },
});

const classEvaluationListFiltersCodec = defineUrlFilterCodec({
	kind: { type: 'string', default: 'all' },
});

const classAttendanceListFiltersCodec = defineUrlFilterCodec({
	completion: { type: 'string', default: 'all' },
});

export type CalendarListFilters = ReturnType<typeof calendarListFiltersCodec.read>;
export type ConfigSubjectListFilters = ReturnType<typeof configSubjectListFiltersCodec.read>;
export type TeachingListFilters = ReturnType<typeof teachingListFiltersCodec.read>;
export type PlanningListFilters = ReturnType<typeof planningListFiltersCodec.read>;
export type ClassStudentListFilters = ReturnType<typeof classStudentListFiltersCodec.read>;
export type ActivityListFilters = ReturnType<typeof activityListFiltersCodec.read>;
export type AnnouncementListFilters = ReturnType<typeof announcementListFiltersCodec.read>;
export type FamilyFeedbackListFilters = ReturnType<typeof familyFeedbackListFiltersCodec.read>;
export type StudentListFilters = ReturnType<typeof studentListFiltersCodec.read>;
export type GuardianListFilters = ReturnType<typeof guardianListFiltersCodec.read>;
export type StaffListFilters = ReturnType<typeof staffListFiltersCodec.read>;
export type TeacherListFilters = ReturnType<typeof teacherListFiltersCodec.read>;
export type ClassReportCardListFilters = ReturnType<typeof classReportCardListFiltersCodec.read>;
export type PaymentListFilters = ReturnType<typeof paymentListFiltersCodec.read>;
export type ReportCardDefinitionListFilters = ReturnType<typeof reportCardDefinitionListFiltersCodec.read>;
export type RoleListFilters = ReturnType<typeof roleListFiltersCodec.read>;
export type GradeScaleListFilters = ReturnType<typeof gradeScaleListFiltersCodec.read>;
export type FeeListFilters = ReturnType<typeof feeListFiltersCodec.read>;
export type ClassGroupListFilters = ReturnType<typeof classGroupListFiltersCodec.read>;
export type AcademicAdminListFilters = ReturnType<typeof academicAdminListFiltersCodec.read>;
export type DisciplineCatalogListFilters = ReturnType<typeof disciplineCatalogListFiltersCodec.read>;
export type PermissionProfileListFilters = ReturnType<typeof permissionProfileListFiltersCodec.read>;
export type ResourceListFilters = ReturnType<typeof resourceListFiltersCodec.read>;
export type EducatorDashboardListFilters = ReturnType<typeof educatorDashboardListFiltersCodec.read>;
export type ClassEvaluationListFilters = ReturnType<typeof classEvaluationListFiltersCodec.read>;
export type ClassAttendanceListFilters = ReturnType<typeof classAttendanceListFiltersCodec.read>;

export function readCalendarListFilters(url: URL): CalendarListFilters {
	return calendarListFiltersCodec.read(url);
}

export function writeCalendarListFilters(url: URL, filters: CalendarListFilters): string {
	return calendarListFiltersCodec.write(url, filters);
}

export function readConfigSubjectListFilters(url: URL): ConfigSubjectListFilters {
	return configSubjectListFiltersCodec.read(url);
}

export function writeConfigSubjectListFilters(url: URL, filters: ConfigSubjectListFilters): string {
	return configSubjectListFiltersCodec.write(url, filters);
}

export function readTeachingListFilters(url: URL): TeachingListFilters {
	return teachingListFiltersCodec.read(url);
}

export function writeTeachingListFilters(url: URL, filters: TeachingListFilters): string {
	return teachingListFiltersCodec.write(url, filters);
}

export function readPlanningListFilters(url: URL): PlanningListFilters {
	return planningListFiltersCodec.read(url);
}

export function writePlanningListFilters(url: URL, filters: PlanningListFilters): string {
	return planningListFiltersCodec.write(url, filters);
}

export function readClassStudentListFilters(url: URL): ClassStudentListFilters {
	return classStudentListFiltersCodec.read(url);
}

export function writeClassStudentListFilters(url: URL, filters: ClassStudentListFilters): string {
	return classStudentListFiltersCodec.write(url, filters);
}

export function readActivityListFilters(url: URL): ActivityListFilters {
	return activityListFiltersCodec.read(url);
}

export function writeActivityListFilters(url: URL, filters: ActivityListFilters): string {
	return activityListFiltersCodec.write(url, filters);
}

export function readAnnouncementListFilters(url: URL): AnnouncementListFilters {
	return announcementListFiltersCodec.read(url);
}

export function writeAnnouncementListFilters(url: URL, filters: AnnouncementListFilters): string {
	return announcementListFiltersCodec.write(url, filters);
}

export function readFamilyFeedbackListFilters(url: URL): FamilyFeedbackListFilters {
	return familyFeedbackListFiltersCodec.read(url);
}

export function writeFamilyFeedbackListFilters(url: URL, filters: FamilyFeedbackListFilters): string {
	return familyFeedbackListFiltersCodec.write(url, filters);
}

export function readStudentListFilters(url: URL): StudentListFilters {
	return studentListFiltersCodec.read(url);
}

export function writeStudentListFilters(url: URL, filters: StudentListFilters): string {
	return studentListFiltersCodec.write(url, filters);
}

export function readGuardianListFilters(url: URL): GuardianListFilters {
	return guardianListFiltersCodec.read(url);
}

export function writeGuardianListFilters(url: URL, filters: GuardianListFilters): string {
	return guardianListFiltersCodec.write(url, filters);
}

export function readStaffListFilters(url: URL): StaffListFilters {
	return staffListFiltersCodec.read(url);
}

export function writeStaffListFilters(url: URL, filters: StaffListFilters): string {
	return staffListFiltersCodec.write(url, filters);
}

export function readTeacherListFilters(url: URL): TeacherListFilters {
	return teacherListFiltersCodec.read(url);
}

export function writeTeacherListFilters(url: URL, filters: TeacherListFilters): string {
	return teacherListFiltersCodec.write(url, filters);
}

export function readClassReportCardListFilters(url: URL): ClassReportCardListFilters {
	return classReportCardListFiltersCodec.read(url);
}

export function writeClassReportCardListFilters(url: URL, filters: ClassReportCardListFilters): string {
	return classReportCardListFiltersCodec.write(url, filters);
}

export function readPaymentListFilters(url: URL): PaymentListFilters {
	return paymentListFiltersCodec.read(url);
}

export function writePaymentListFilters(url: URL, filters: PaymentListFilters): string {
	return paymentListFiltersCodec.write(url, filters);
}

export function readReportCardDefinitionListFilters(url: URL): ReportCardDefinitionListFilters {
	return reportCardDefinitionListFiltersCodec.read(url);
}

export function writeReportCardDefinitionListFilters(
	url: URL,
	filters: ReportCardDefinitionListFilters,
): string {
	return reportCardDefinitionListFiltersCodec.write(url, filters);
}

export function readRoleListFilters(url: URL): RoleListFilters {
	return roleListFiltersCodec.read(url);
}

export function writeRoleListFilters(url: URL, filters: RoleListFilters): string {
	return roleListFiltersCodec.write(url, filters);
}

export function readGradeScaleListFilters(url: URL): GradeScaleListFilters {
	return gradeScaleListFiltersCodec.read(url);
}

export function writeGradeScaleListFilters(url: URL, filters: GradeScaleListFilters): string {
	return gradeScaleListFiltersCodec.write(url, filters);
}

export function readFeeListFilters(url: URL): FeeListFilters {
	return feeListFiltersCodec.read(url);
}

export function writeFeeListFilters(url: URL, filters: FeeListFilters): string {
	return feeListFiltersCodec.write(url, filters);
}

export function readClassGroupListFilters(url: URL): ClassGroupListFilters {
	return classGroupListFiltersCodec.read(url);
}

export function writeClassGroupListFilters(url: URL, filters: ClassGroupListFilters): string {
	return classGroupListFiltersCodec.write(url, filters);
}

export function readAcademicAdminListFilters(url: URL): AcademicAdminListFilters {
	return academicAdminListFiltersCodec.read(url);
}

export function writeAcademicAdminListFilters(url: URL, filters: AcademicAdminListFilters): string {
	return academicAdminListFiltersCodec.write(url, filters);
}

export function readDisciplineCatalogListFilters(url: URL): DisciplineCatalogListFilters {
	return disciplineCatalogListFiltersCodec.read(url);
}

export function writeDisciplineCatalogListFilters(
	url: URL,
	filters: DisciplineCatalogListFilters,
): string {
	return disciplineCatalogListFiltersCodec.write(url, filters);
}

export function readPermissionProfileListFilters(url: URL): PermissionProfileListFilters {
	return permissionProfileListFiltersCodec.read(url);
}

export function writePermissionProfileListFilters(
	url: URL,
	filters: PermissionProfileListFilters,
): string {
	return permissionProfileListFiltersCodec.write(url, filters);
}

export function readResourceListFilters(url: URL): ResourceListFilters {
	return resourceListFiltersCodec.read(url);
}

export function writeResourceListFilters(url: URL, filters: ResourceListFilters): string {
	return resourceListFiltersCodec.write(url, filters);
}

export function readEducatorDashboardListFilters(url: URL): EducatorDashboardListFilters {
	return educatorDashboardListFiltersCodec.read(url);
}

export function writeEducatorDashboardListFilters(
	url: URL,
	filters: EducatorDashboardListFilters,
): string {
	return educatorDashboardListFiltersCodec.write(url, filters);
}

export function readClassEvaluationListFilters(url: URL): ClassEvaluationListFilters {
	return classEvaluationListFiltersCodec.read(url);
}

export function writeClassEvaluationListFilters(
	url: URL,
	filters: ClassEvaluationListFilters,
): string {
	return classEvaluationListFiltersCodec.write(url, filters);
}

export function readClassAttendanceListFilters(url: URL): ClassAttendanceListFilters {
	return classAttendanceListFiltersCodec.read(url);
}

export function writeClassAttendanceListFilters(
	url: URL,
	filters: ClassAttendanceListFilters,
): string {
	return classAttendanceListFiltersCodec.write(url, filters);
}
