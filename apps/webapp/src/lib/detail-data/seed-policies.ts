import type { Crud } from '$lib/components/school/shared/drawer-constants';
import type {
	Activity,
	Announcement,
	AbsenceRecord,
	AssessmentResultRow,
	AttendanceDay,
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

export function mergeById<T extends { id: string }>(existing: readonly T[], incoming: readonly T[]): T[] {
	const map = new Map(existing.map(item => [item.id, item]));
	for (const item of incoming) {
		map.set(item.id, item);
	}
	return [...map.values()];
}

export function replaceSlice<T extends { id: string }>(
	existing: readonly T[],
	incoming: readonly T[],
	matchesSlice: (item: T) => boolean,
): T[] {
	const kept = existing.filter(item => !matchesSlice(item));
	return mergeById(kept, incoming);
}

/** Merge by id school-wide; replace class slice when `scope.classId` is set. */
export function seedStudentsCollection(
	existing: readonly Student[],
	students: readonly Student[],
	scope?: { classId?: string },
): Student[] {
	if (scope?.classId) {
		return replaceSlice(existing, students, student => student.classId === scope.classId);
	}
	return mergeById(existing, students);
}

export function seedGuardiansCollection(existing: readonly Guardian[], guardians: readonly Guardian[]): Guardian[] {
	return mergeById(existing, guardians);
}

export function seedStudent360Collections(
	healthRecords: Readonly<Record<string, HealthRecord>>,
	allNotes: readonly PedagogicalNote[],
	studentId: string,
	healthRecord: HealthRecord | undefined,
	studentNotes: readonly PedagogicalNote[],
) {
	const nextHealthRecords = { ...healthRecords };
	if (healthRecord) {
		nextHealthRecords[studentId] = healthRecord;
	}
	else {
		delete nextHealthRecords[studentId];
	}

	return {
		healthRecords: nextHealthRecords,
		pedagogicalNotes: mergeById(
			allNotes.filter(note => note.studentId !== studentId),
			studentNotes,
		),
	};
}

export function seedStaffCollection(existing: readonly StaffMember[], staff: readonly StaffMember[]): StaffMember[] {
	return mergeById(existing, staff);
}

export function seedSubjectsCollection(
	existing: readonly Subject[],
	subjects: readonly Subject[],
	scope: { classId: string },
): Subject[] {
	return replaceSlice(existing, subjects, subject => subject.classId === scope.classId);
}

export function seedPlanningCollection(
	existing: readonly PlanningEvent[],
	events: readonly PlanningEvent[],
	scope: { classId: string },
): PlanningEvent[] {
	return replaceSlice(existing, events, event => event.classId === scope.classId);
}

export function seedSchedulesCollection(
	existing: readonly TimetableSchedule[],
	schedules: readonly TimetableSchedule[],
	scope: { classId: string },
): TimetableSchedule[] {
	return replaceSlice(existing, schedules, schedule => schedule.classId === scope.classId);
}

export function seedEvaluationsCollection(
	existing: readonly Evaluation[],
	evaluations: readonly Evaluation[],
	scope: { classId: string },
): Evaluation[] {
	return replaceSlice(existing, evaluations, evaluation => evaluation.classId === scope.classId);
}

export function seedAttendanceDaysCollection(
	existing: readonly AttendanceDay[],
	attendanceDays: readonly AttendanceDay[],
	scope: { classId: string },
): AttendanceDay[] {
	return replaceSlice(existing, attendanceDays, day => day.classId === scope.classId);
}

export function seedDeadlinesCollection(
	existing: readonly Deadline[],
	deadlines: readonly Deadline[],
	scope: { classId: string },
): Deadline[] {
	return replaceSlice(existing, deadlines, deadline => deadline.classId === scope.classId);
}

export function seedIncidentsCollection(existing: readonly Incident[], incidents: readonly Incident[]): Incident[] {
	return mergeById(existing, incidents);
}

export function seedActivitiesCollection(existing: readonly Activity[], activities: readonly Activity[]): Activity[] {
	return mergeById(existing, activities);
}

export function seedAnnouncementsCollection(
	existing: readonly Announcement[],
	announcements: readonly Announcement[],
): Announcement[] {
	return mergeById(existing, announcements);
}

export function seedBillingCollection(existing: readonly StudentBilling[], billing: readonly StudentBilling[]): StudentBilling[] {
	return mergeById(existing, billing);
}

export function seedFeesCollection(existing: readonly Fee[], fees: readonly Fee[]): Fee[] {
	return mergeById(existing, fees);
}

export function seedAbsencesCollection(_existing: readonly AbsenceRecord[], absences: readonly AbsenceRecord[]): AbsenceRecord[] {
	return mergeById([], absences);
}

export function seedResourcesCollection(existing: readonly Resource[], resources: readonly Resource[]): Resource[] {
	return mergeById(existing, resources);
}

export function seedSchoolYearEventsCollection(
	_existing: readonly SchoolYearEvent[],
	events: readonly SchoolYearEvent[],
): SchoolYearEvent[] {
	return mergeById([], events);
}

export function seedAssessmentResultsCollection(
	existing: readonly AssessmentResultRow[],
	results: readonly AssessmentResultRow[],
): AssessmentResultRow[] {
	return mergeById(existing, results);
}

export function seedAssessmentResultsForAssessments(
	existing: readonly AssessmentResultRow[],
	results: readonly AssessmentResultRow[],
	scope: { assessmentIds: readonly string[] },
): AssessmentResultRow[] {
	const assessmentIds = new Set(scope.assessmentIds);
	const kept = existing.filter(result => !assessmentIds.has(result.assessmentId));
	return mergeById(kept, results);
}

export function seedRolePermissionsCollection(snapshot: {
	roleCrudMatrix: Partial<Record<StaffRole, Record<string, Record<Crud, boolean>>>>;
	roleEnabledPermissions: Partial<Record<StaffRole, Record<string, boolean>>>;
}) {
	return {
		roleCrudMatrix: snapshot.roleCrudMatrix,
		roleEnabledPermissions: snapshot.roleEnabledPermissions,
	};
}
