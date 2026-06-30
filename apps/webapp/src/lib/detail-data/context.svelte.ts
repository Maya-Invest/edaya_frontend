import type { Crud } from '$lib/components/school/shared/drawer-constants';
import type {
	AbsenceRecord,
	Activity,
	Announcement,
	AnnouncementTarget,
	AssessmentResultRow,
	Deadline,
	Evaluation,
	Fee,
	Guardian,
	HealthRecord,
	Incident,
	PedagogicalNote,
	PlanningEvent,
	Resource,
	SchoolYearEvent,
	StaffMember,
	StaffRole,
	Student,
	StudentBilling,
	Subject,
	TimetableSchedule,
} from '$lib/types/school';
import {
	seedAbsencesCollection,
	seedActivitiesCollection,
	seedAnnouncementsCollection,
	seedAssessmentResultsCollection,
	seedAssessmentResultsForAssessments,
	seedBillingCollection,
	seedDeadlinesCollection,
	seedEvaluationsCollection,
	seedFeesCollection,
	seedGuardiansCollection,
	seedIncidentsCollection,
	seedPlanningCollection,
	seedSchedulesCollection,
	seedResourcesCollection,
	seedRolePermissionsCollection,
	seedSchoolYearEventsCollection,
	seedStaffCollection,
	seedStudent360Collections,
	seedStudentsCollection,
	seedSubjectsCollection,
	mergeById,
} from './seed-policies';

interface RolePermissionsSnapshot {
	roleCrudMatrix: Partial<Record<StaffRole, Record<string, Record<Crud, boolean>>>>;
	roleEnabledPermissions: Partial<Record<StaffRole, Record<string, boolean>>>;
}

export class DetailDataContext {
	students = $state<Student[]>([]);
	guardians = $state<Guardian[]>([]);
	staff = $state<StaffMember[]>([]);
	subjects = $state<Subject[]>([]);
	planning = $state<PlanningEvent[]>([]);
	schedules = $state<TimetableSchedule[]>([]);
	evaluations = $state<Evaluation[]>([]);
	assessmentResults = $state<AssessmentResultRow[]>([]);
	activities = $state<Activity[]>([]);
	announcements = $state<Announcement[]>([]);
	deadlines = $state<Deadline[]>([]);
	incidents = $state<Incident[]>([]);
	schoolYearEvents = $state<SchoolYearEvent[]>([]);
	billing = $state<StudentBilling[]>([]);
	fees = $state<Fee[]>([]);
	healthRecords = $state<Record<string, HealthRecord>>({});
	pedagogicalNotes = $state<PedagogicalNote[]>([]);
	absences = $state<AbsenceRecord[]>([]);
	resources = $state<Resource[]>([]);
	roleCrudMatrix = $state<Partial<Record<StaffRole, Record<string, Record<Crud, boolean>>>>>({});
	roleEnabledPermissions = $state<Partial<Record<StaffRole, Record<string, boolean>>>>({});

	private replaceById<T extends { id: string }>(items: readonly T[], id: string, patch: Partial<T>): T[] {
		const index = items.findIndex(item => item.id === id);
		if (index === -1) {
			return [...items];
		}
		const next = items.slice() as T[];
		next[index] = { ...next[index]!, ...patch };
		return next;
	}

	// --- Seed policies (see specs/data-loading-spec.md) ---
	// Merge by id: students (school-wide), guardians, staff, incidents, activities, billing, fees, resources
	// Replace class slice: students (class scope), planning, evaluations, deadlines, subjects
	// Replace all: role permissions, active-year calendar events and absences

	/** Merge by id school-wide; replace class slice when `scope.classId` is set. */
	seedStudents(students: Student[], scope?: { classId?: string }) {
		this.students = seedStudentsCollection(this.students, students, scope);
	}

	/** Merge by id. */
	seedGuardians(guardians: Guardian[]) {
		this.guardians = seedGuardiansCollection(this.guardians, guardians);
	}

	seedStudent360Data(
		studentId: string,
		healthRecord: HealthRecord | undefined,
		pedagogicalNotes: PedagogicalNote[],
	) {
		const next = seedStudent360Collections(
			this.healthRecords,
			this.pedagogicalNotes,
			studentId,
			healthRecord,
			pedagogicalNotes,
		);
		this.healthRecords = next.healthRecords;
		this.pedagogicalNotes = next.pedagogicalNotes;
	}

	/** Merge by id. */
	seedStaff(staff: StaffMember[]) {
		this.staff = seedStaffCollection(this.staff, staff);
	}

	/** Replace the class slice. */
	seedSubjects(subjects: Subject[], scope: { classId: string }) {
		this.subjects = seedSubjectsCollection(this.subjects, subjects, scope);
	}

	/** Replace the class slice. */
	seedPlanning(events: PlanningEvent[], scope: { classId: string }) {
		this.planning = seedPlanningCollection(this.planning, events, scope);
	}

	/** Replace the class slice. */
	seedSchedules(schedules: TimetableSchedule[], scope: { classId: string }) {
		this.schedules = seedSchedulesCollection(this.schedules, schedules, scope);
	}

	/** Replace the class slice. */
	seedEvaluations(evaluations: Evaluation[], scope: { classId: string }) {
		this.evaluations = seedEvaluationsCollection(this.evaluations, evaluations, scope);
	}

	/** Replace results for the given assessments; merge the rest of the store. */
	seedAssessmentResults(results: AssessmentResultRow[], scope: { assessmentIds: string[] }) {
		this.assessmentResults = seedAssessmentResultsForAssessments(
			this.assessmentResults,
			results,
			scope,
		);
	}

	/** Replace the class slice. */
	seedDeadlines(deadlines: Deadline[], scope: { classId: string }) {
		this.deadlines = seedDeadlinesCollection(this.deadlines, deadlines, scope);
	}

	/** Merge by id. */
	seedIncidents(incidents: Incident[]) {
		this.incidents = seedIncidentsCollection(this.incidents, incidents);
	}

	/** Merge by id. */
	seedActivities(activities: Activity[]) {
		this.activities = seedActivitiesCollection(this.activities, activities);
	}

	/** Merge by id. */
	seedAnnouncements(announcements: Announcement[]) {
		this.announcements = seedAnnouncementsCollection(this.announcements, announcements);
	}

	/** Merge by id. */
	seedBilling(billing: StudentBilling[]) {
		this.billing = seedBillingCollection(this.billing, billing);
	}

	/** Merge by id. */
	seedFees(fees: Fee[]) {
		this.fees = seedFeesCollection(this.fees, fees);
	}

	/** Merge by id. */
	seedAbsences(absences: AbsenceRecord[]) {
		this.absences = seedAbsencesCollection(this.absences, absences);
	}

	/** Merge by id. */
	seedResources(resources: Resource[]) {
		this.resources = seedResourcesCollection(this.resources, resources);
	}

	/** Merge by id. */
	seedSchoolYearEvents(events: SchoolYearEvent[]) {
		this.schoolYearEvents = seedSchoolYearEventsCollection(this.schoolYearEvents, events);
	}

	/** Replace the full role-permission matrices. */
	seedRolePermissions(snapshot: RolePermissionsSnapshot) {
		const next = seedRolePermissionsCollection(snapshot);
		this.roleCrudMatrix = next.roleCrudMatrix;
		this.roleEnabledPermissions = next.roleEnabledPermissions;
	}

	studentsForClass(classId: string): Student[] {
		return this.students.filter(student => student.classId === classId);
	}

	planningForClass(classId: string): PlanningEvent[] {
		return this.planning.filter(event => event.classId === classId);
	}

	schedulesForClass(classId: string): TimetableSchedule[] {
		return this.schedules.filter(schedule => schedule.classId === classId);
	}

	evaluationsForClass(classId: string): Evaluation[] {
		return this.evaluations.filter(evaluation => evaluation.classId === classId);
	}

	deadlinesForClass(classId: string): Deadline[] {
		return this.deadlines.filter(deadline => deadline.classId === classId);
	}

	subjectsForClass(classId: string): Subject[] {
		return this.subjects.filter(subject => subject.classId === classId);
	}

	patchPlanningEvent(id: string, patch: Partial<PlanningEvent>) {
		this.planning = this.replaceById(this.planning, id, patch);
	}

	appendPlanningEvent(event: PlanningEvent) {
		this.planning = mergeById(this.planning, [event]);
	}

	removePlanningEvent(id: string) {
		this.planning = this.planning.filter(event => event.id !== id);
	}

	patchSchedule(id: string, patch: Partial<TimetableSchedule>) {
		this.schedules = this.replaceById(this.schedules, id, patch);
	}

	appendSchedule(schedule: TimetableSchedule) {
		this.schedules = mergeById(this.schedules, [schedule]);
	}

	removeSchedule(id: string) {
		this.schedules = this.schedules.filter(schedule => schedule.id !== id);
	}

	appendEvaluation(evaluation: Evaluation) {
		this.evaluations = mergeById(this.evaluations, [evaluation]);
	}

	patchEvaluation(id: string, patch: Partial<Evaluation>) {
		this.evaluations = this.replaceById(this.evaluations, id, patch);
	}

	removeEvaluation(id: string) {
		this.evaluations = this.evaluations.filter(evaluation => evaluation.id !== id);
	}

	appendDeadline(deadline: Deadline) {
		this.deadlines = mergeById(this.deadlines, [deadline]);
	}

	removeDeadline(id: string) {
		this.deadlines = this.deadlines.filter(deadline => deadline.id !== id);
	}

	removeSubject(id: string) {
		this.subjects = this.subjects.filter(subject => subject.id !== id);
	}

	patchDeadline(id: string, patch: Partial<Deadline>) {
		this.deadlines = this.replaceById(this.deadlines, id, patch);
	}

	appendActivity(activity: Activity) {
		this.activities = mergeById(this.activities, [activity]);
	}

	removeActivity(id: string) {
		this.activities = this.activities.filter(activity => activity.id !== id);
	}

	patchActivity(id: string, patch: Partial<Activity>) {
		this.activities = this.replaceById(this.activities, id, patch);
	}

	appendAnnouncement(announcement: Announcement) {
		this.announcements = mergeById(this.announcements, [announcement]);
	}

	removeAnnouncement(id: string) {
		this.announcements = this.announcements.filter(announcement => announcement.id !== id);
	}

	patchAnnouncement(id: string, patch: Partial<Announcement>) {
		this.announcements = this.replaceById(this.announcements, id, patch);
	}

	appendAnnouncementTarget(announcementId: string, target: AnnouncementTarget) {
		this.announcements = this.announcements.map((announcement) => {
			if (announcement.id !== announcementId) {
				return announcement;
			}
			return {
				...announcement,
				targets: mergeById(announcement.targets, [target]),
			};
		});
	}

	removeAnnouncementTarget(announcementId: string, targetId: string) {
		this.announcements = this.announcements.map((announcement) => {
			if (announcement.id !== announcementId) {
				return announcement;
			}
			return {
				...announcement,
				targets: announcement.targets.filter(target => target.id !== targetId),
			};
		});
	}

	patchIncident(id: string, patch: Partial<Incident>) {
		this.incidents = this.replaceById(this.incidents, id, patch);
	}

	appendSchoolYearEvent(event: SchoolYearEvent) {
		this.schoolYearEvents = mergeById(this.schoolYearEvents, [event]);
	}

	removeSchoolYearEvent(id: string) {
		this.schoolYearEvents = this.schoolYearEvents.filter(event => event.id !== id);
	}

	patchSchoolYearEvent(id: string, patch: Partial<SchoolYearEvent>) {
		this.schoolYearEvents = this.replaceById(this.schoolYearEvents, id, patch);
	}

	appendFee(fee: Fee) {
		this.fees = mergeById(this.fees, [fee]);
	}

	removeFee(id: string) {
		this.fees = this.fees.filter(fee => fee.id !== id);
	}

	patchFee(id: string, patch: Partial<Fee>) {
		this.fees = this.replaceById(this.fees, id, patch);
	}

	appendBilling(record: StudentBilling) {
		this.billing = mergeById(this.billing, [record]);
	}

	removeBilling(id: string) {
		this.billing = this.billing.filter(record => record.id !== id);
	}

	patchBilling(id: string, patch: Partial<StudentBilling>) {
		this.billing = this.replaceById(this.billing, id, patch);
	}

	patchRoleCrudMatrix(role: StaffRole, matrix: Record<string, Record<Crud, boolean>>) {
		this.roleCrudMatrix = { ...this.roleCrudMatrix, [role]: matrix };
		this.roleEnabledPermissions = {
			...this.roleEnabledPermissions,
			[role]: Object.fromEntries(
				Object.entries(matrix).map(([key, crud]) => [key, Object.values(crud).some(Boolean)]),
			),
		};
	}

	patchStudent(id: string, patch: Partial<Student>) {
		this.students = this.replaceById(this.students, id, patch);
	}

	patchGuardian(id: string, patch: Partial<Guardian>) {
		this.guardians = this.replaceById(this.guardians, id, patch);
	}

	patchStaff(id: string, patch: Partial<StaffMember>) {
		this.staff = this.replaceById(this.staff, id, patch);
	}

	removeGuardian(id: string) {
		this.guardians = this.guardians.filter(guardian => guardian.id !== id);
	}

	removeStaff(id: string) {
		this.staff = this.staff.filter(member => member.id !== id);
	}

	patchPedagogicalNote(id: string, patch: Partial<PedagogicalNote>) {
		this.pedagogicalNotes = this.replaceById(this.pedagogicalNotes, id, patch);
	}

	appendPedagogicalNote(note: PedagogicalNote) {
		this.pedagogicalNotes = [...this.pedagogicalNotes, note];
	}

	appendIncident(incident: Incident) {
		this.incidents = [...this.incidents, incident];
	}

	removeIncident(id: string) {
		this.incidents = this.incidents.filter(incident => incident.id !== id);
	}

	appendAbsence(absence: AbsenceRecord) {
		this.absences = [...this.absences, absence];
	}

	removeAbsence(id: string) {
		this.absences = this.absences.filter(absence => absence.id !== id);
	}

	appendAssessmentResult(result: AssessmentResultRow) {
		this.assessmentResults = seedAssessmentResultsCollection(this.assessmentResults, [result]);
	}

	removeAssessmentResult(id: string) {
		this.assessmentResults = this.assessmentResults.filter(result => result.id !== id);
	}

	reset() {
		this.students = [];
		this.guardians = [];
		this.staff = [];
		this.subjects = [];
		this.planning = [];
		this.evaluations = [];
		this.assessmentResults = [];
		this.activities = [];
		this.deadlines = [];
		this.incidents = [];
		this.schoolYearEvents = [];
		this.billing = [];
		this.fees = [];
		this.healthRecords = {};
		this.pedagogicalNotes = [];
		this.absences = [];
		this.resources = [];
		this.roleCrudMatrix = {};
		this.roleEnabledPermissions = {};
	}
}

export const detailDataContext = new DetailDataContext();

/** Spec alias — same singleton as `detailDataContext`. */
export const entityStore = detailDataContext;
