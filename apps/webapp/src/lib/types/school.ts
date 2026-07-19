export type ClassAttendanceMode = 'daily' | 'session';

export interface ClassNode {
	id: string;
	schoolId: string;
	academicYearId: string;
	gradeLevelId: string;
	name: string;
	/** Cycle scolaire (Middle School / High School) — aligné sur `GradeLevel.cycle`. */
	level: string;
	studentCount: number;
	capacity?: number | null;
	attendanceMode: ClassAttendanceMode;
	homeroomStaffId?: string | null;
}

export interface HierarchyGroup { level: string; classes: ClassNode[] }

export interface Student {
	id: string;
	classId: string;
	enrollmentId?: string;
	name: string;
	initials: string;
	photoUrl?: string | null;
	email: string;
	birthdate: string;
	matricule?: string | null;
	gender?: string | null;
	guardian: string;
	attendance: number;
	average: number;
	status: 'active' | 'warning' | 'honor';
	subjectId?: string | null;
}

export type SubjectCategory = 'Scientifique' | 'Littéraire' | 'Langues' | 'Sciences humaines' | 'Sport' | 'Arts';

export interface Subject {
	id: string;
	classId: string;
	/** Catalogue matières : regroupement par niveau (distinct des matières de classe). */
	gradeLevelId?: string;
	name: string;
	teacher: string;
	hoursPerWeek: number;
	color: 'mint' | 'sky' | 'warm';
	description: string;
	category: SubjectCategory;
}

export type PlanningEventKind = 'lesson' | 'homework-due' | 'assessment' | 'activity';

export type PlanningOccurrenceStatus = 'pending' | 'completed' | 'cancelled';

export interface PlanningEvent {
	id: string;
	classId: string;
	scheduleId?: string;
	kind: PlanningEventKind;
	title: string;
	subject: string;
	day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
	start: string;
	end: string;
	startsAt: string;
	endsAt: string;
	room: string;
	teacher: string;
	status?: PlanningOccurrenceStatus;
	timetableGenerated?: 'draft' | 'published' | null;
}

export type TimetableScheduleDay
	= | 'monday'
		| 'tuesday'
		| 'wednesday'
		| 'thursday'
		| 'friday'
		| 'saturday'
		| 'sunday';

export type TimetableScheduleKind = 'lesson' | 'activity';

export interface TimetableSchedule {
	id: string;
	classId: string;
	scheduleKind: TimetableScheduleKind;
	classSubjectId?: string;
	activityId?: string;
	title: string;
	isRecurring: boolean;
	dayOfWeek?: TimetableScheduleDay;
	day: PlanningEvent['day'];
	startTime: string;
	endTime: string;
	subject: string;
	specificDate?: string;
}

export interface AssessmentResultRow {
	id: string;
	studentId: string;
	assessmentId: string;
	score: number | null;
	status?: 'met' | 'late' | 'missed' | 'excused' | null;
}

export type AssessmentKind = 'quiz' | 'homework' | 'project' | 'other';

export interface EvaluationSubmission {
	studentId: string;
	status: 'submitted' | 'late' | 'missing';
	date?: string;
}

export interface Evaluation {
	id: string;
	classId: string;
	classSubjectId: string;
	title: string;
	subject: string;
	kind: AssessmentKind;
	date: string;
	coefficient: number;
	averageMark: number;
	outOf: number;
	graded: number;
	total: number;
	description?: string;
	dueDate?: string;
	assignedDate?: string;
	startsAt?: string;
	endsAt?: string;
	lessonSessionId?: string | null;
	attachments: { name: string; size: string }[];
	submissions: EvaluationSubmission[];
	submittedCount: number;
}

export interface Guardian {
	id: string;
	name: string;
	initials: string;
	photoUrl?: string | null;
	relation: 'Mother' | 'Father' | 'Legal guardian';
	email: string;
	phone: string;
	studentIds: string[];
	preferredContact: 'email' | 'phone' | 'sms';
	subjectId?: string | null;
}

export type StaffRole = 'owner' | 'directeur' | 'prof_principal' | 'professeur' | 'educateur';

export interface StaffMember {
	id: string;
	name: string;
	initials: string;
	photoUrl?: string | null;
	role: StaffRole;
	department: string;
	email: string;
	classes: string[];
	mainClassId?: string;
	subjectsTaught?: string[];
	subjectLabels?: string[];
	isActive: boolean;
	subjectId?: string | null;
}

export interface Teacher {
	id: string;
	name: string;
	initials: string;
	photoUrl?: string | null;
	email: string;
	phone: string;
	isActive: boolean;
	subjectId?: string | null;
}

export type ChronicCondition = 'Asthme' | 'Epilepsie' | 'Diabete';

export interface HealthRecord {
	studentId: string;
	bloodType: string;
	allergies: string[];
	medications: string[];
	chronicConditions: ChronicCondition[];
	lastVisit: string;
	notes: string;
}

export interface Incident {
	id: string;
	studentId: string;
	involvedStudentIds: string[];
	involvedCount: number;
	date: string;
	category: 'Behavior' | 'Tardiness' | 'Conflict' | 'Other';
	severity: 'low' | 'medium' | 'high';
	summary: string;
	status: 'open' | 'resolved' | 'cancelled';
}

export interface StudentEnrollmentHistoryItem {
	id: string;
	classGroupId: string;
	className: string;
	academicYearId: string;
	status: 'active' | 'closed';
	enrolledAt: string;
	endedAt?: string;
	endReason?: 'completed' | 'transferred' | 'withdrawn' | null;
}

export interface StudentGradeRow {
	assessmentId: string;
	classGroupId: string;
	title: string;
	subject: string;
	date: string;
	score: number | null;
	outOf: number;
	coefficient: number;
	kind: AssessmentKind;
}

export interface StudentAttendanceHistoryItem {
	id: string;
	date: string;
	time: string;
	label: string;
	status: 'present' | 'absent' | 'late';
	kind: 'daily' | 'session';
}

export interface IncidentSanctionRow {
	id: string;
	studentId: string;
	studentName: string;
	actionName: string;
	status: 'active' | 'completed' | 'cancelled';
	notes?: string;
}

export interface AttendanceDay {
	id: string;
	classId: string;
	date: string;
	label: string;
	totalStudents: number;
	recordedCount: number;
}

export interface AbsenceRecord {
	id: string;
	studentId: string;
	date: string;
	time: string;
	subject: string;
	eventType: 'Cours' | 'Évaluation' | 'Activité';
	reason?: string;
}

export interface Deadline {
	id: string;
	classId: string;
	title: string;
	subject: string;
	description: string;
	dueDate: string;
	assignedDate: string;
	type: 'Homework' | 'Project' | 'Reading' | 'Lab';
	attachments: { name: string; size: string }[];
	submissions: { studentId: string; status: 'submitted' | 'late' | 'missing'; date?: string }[];
}

export interface Fee {
	id: string;
	name: string;
	category: 'Tuition' | 'Transport' | 'Meals' | 'Activities' | 'Materials';
	amount: number;
	period: 'Year' | 'Term' | 'Month';
}

export interface StudentBilling {
	id: string;
	studentId: string;
	feeId: string;
	total: number;
	paid: number;
	status: 'paid' | 'partial' | 'due' | 'overdue';
	dueDate: string;
	installments: { date: string; amount: number; status: 'paid' | 'pending' }[];
}

export type AcademicPublishStatus = 'draft' | 'published';

export interface PeriodDefinition {
	id: string;
	schoolId: string;
	academicYearId: string;
	label: string;
	order: number;
	startTime: string;
	endTime: string;
	isBreak: boolean;
}

export interface GradeLevel {
	id: string;
	schoolId: string;
	name: string;
	cycle: string;
	order: number;
}

export interface AcademicYear {
	id: string;
	schoolId: string;
	label: string;
	startDate: string;
	endDate: string;
	status: AcademicPublishStatus;
}

export interface AcademicPeriod {
	id: string;
	schoolId: string;
	academicYearId: string;
	label: string;
	range: string;
	startDate: string;
	endDate: string;
	status: AcademicPublishStatus;
}

export type SchoolType = 'primary' | 'secondary' | 'k12' | 'vocational' | 'other';

export interface School {
	id: string;
	name: string;
	shortName: string;
	city: string;
	country?: string;
	timeZone: string;
	type?: SchoolType | null;
	timetableEnforceWorkloadFulfillment: boolean;
	timetableExcludeBreakSlots: boolean;
	timetableMinPeriodGapSameSubject: number;
	timetablePreferredPeriodDefinitionIds: string[];
	timetableAllowUnassignedTeacherPlacements: boolean;
	timetableUseHomeroomTeacherFallback: boolean;
}

export interface SchoolYearEvent {
	id: string;
	/** API record ids when one logical event spans multiple class scopes */
	linkedIds?: string[];
	title: string;
	date: string;
	endDate?: string;
	type: 'holiday' | 'vacation' | 'closure' | 'ceremony';
	description: string;
	scope: 'all' | string[];
}

export interface PedagogicalNote {
	id: string;
	studentId: string;
	date: string;
	authorId: string;
	category: 'Comportement' | 'Travail' | 'Progression' | 'Encouragement';
	content: string;
}

export type ActivityEnrollmentStatus = 'approved' | 'pending' | 'denied';

export interface ActivityEnrollment {
	id: string;
	studentId: string;
	status: ActivityEnrollmentStatus;
}

export interface ClassActivityEnrollment {
	id: string;
	classGroupId: string;
}

export interface Activity {
	id: string;
	name: string;
	category: 'Sport' | 'Arts' | 'Science' | 'Language' | 'Wellbeing';
	coach: string;
	schedule: string;
	participants: number;
	capacity: number;
	description: string;
	startDate: string;
	endDate: string;
	enrollments: ActivityEnrollment[];
	classEnrollments: ClassActivityEnrollment[];
}

export interface Resource {
	id: string;
	name: string;
	type: 'Room' | 'Equipment' | 'Library' | 'Vehicle';
	capacity?: number;
	location: string;
	status: 'available' | 'booked' | 'maintenance';
}

export type AnnouncementStatus = 'draft' | 'published' | 'archived';
export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export type AnnouncementTargetKind
	= | 'school'
		| 'all_staff'
		| 'all_guardians'
		| 'all_students'
		| 'class_group'
		| 'grade_level'
		| 'staff_member'
		| 'guardian'
		| 'student';

export interface AnnouncementTarget {
	id: string;
	announcementId: string;
	targetKind: AnnouncementTargetKind;
	targetId?: string;
}

export interface Announcement {
	id: string;
	title: string;
	content: string;
	status: AnnouncementStatus;
	priority: AnnouncementPriority;
	createdAt: string;
	publishedAt?: string;
	expiresAt?: string;
	createdBy?: string;
	targets: AnnouncementTarget[];
}
