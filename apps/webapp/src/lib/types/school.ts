import type { components } from '@maya-invest/edaya-api-client/schema';

export type ClassAttendanceMode = 'daily' | 'session';

export interface ClassNode {
	shortName?: string;
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

export type StudentApiStatus = 'active' | 'inactive' | 'graduated' | 'archived';
export type StudentAcademicBadge = 'honor' | 'warning';

export interface Student {
	firstName?: string | null;
	lastName?: string | null;
	sourceFullName?: string | null;
	globalIdentifier?: string | null;
	placeOfBirth?: string | null;
	nationality?: string | null;
	enrollmentDate?: string | null;

	id: string;
	classId: string;
	enrollmentId?: string;
	name: string;
	initials: string;
	photoUrl?: string | null;
	photoAttachmentId?: string | null;
	/** Empty when the student has no linked account / invitation email. */
	email: string;
	birthdate: string;
	identifier?: string | null;
	gender?: string | null;
	guardian: string;
	/** Null when no attendance records exist (do not invent 100%). */
	attendance: number | null;
	average: number;
	/** API enrollment/person status — not honor/warning. */
	status: StudentApiStatus;
	/** Derived from grades only; never overwrites `status`. */
	academicBadge?: StudentAcademicBadge | null;
	subjectId?: string | null;
}

export type SubjectCategory = 'Scientifique' | 'Littéraire' | 'Langues' | 'Sciences humaines' | 'Sport' | 'Arts';

export interface Subject {
	disciplineId?: string | null;
	isOptional?: boolean;
	subjectId?: string;
	id: string;
	classId: string;
	/** Catalogue matières : regroupement par niveau (distinct des matières de classe). */
	gradeLevelId?: string;
	name: string;
	teacher: string;
	/** Null when periods/hours are unknown — never invent coeff×2 or default 3. */
	hoursPerWeek: number | null;
	color: 'mint' | 'sky' | 'warm';
	description: string;
	categoryId: string;
	/** Catalog name. The six defaults are still translated with catalogCategory(). */
	category: string;
	shortName?: string | null;
	coefficient?: number | null;
	reportModuleId?: string | null;
	reportOrder?: number;
	isOffered?: boolean;
	participationRevision?: number;
	chapterCount?: number;
	completedChapterCount?: number;
	ongoingChapterCount?: number;
	completedPercentage?: number | null;
	periodsPerWeek?: number | null;
	minPeriodSpan?: number | null;
	maxPeriodSpan?: number | null;
	/** Chapitres programme (catalogue par niveau uniquement). */
	catalogChapters?: CatalogChapter[];
}

export interface CatalogChapter {
	id: string;
	name: string;
	description?: string | null;
	sequenceOrder: number;
	estimatedHours?: number | null;
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
	day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
	start: string;
	end: string;
	startsAt: string;
	endsAt: string;
	room: string;
	teacher: string;
	status?: PlanningOccurrenceStatus;
	timetableGenerated?: boolean;
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
	mentionId?: string | null;
	calculation?: components['schemas']['AssessmentResult']['calculation'];
	designation?: 'scored' | 'absent' | 'exempt' | null;
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
	completedAt?: string;
	/** False when marks were not authorized; an empty authorized result set is still available. */
	marksAvailable?: boolean;
	averageOutOf?: number;
	averagePrecision?: number;
	gradingUpdating?: boolean;
	marksRevision?: number;
	marksStatus?: 'draft' | 'submitted';
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
	alternativePhone?: string | null;
	emailNotificationsEnabled?: boolean;
	smsNotificationsEnabled?: boolean;
	pushNotificationsEnabled?: boolean;
	hasAccess?: boolean;
	links?: components['schemas']['GuardianStudentLink'][];
	firstName?: string | null;
	lastName?: string | null;
	sourceFullName?: string | null;
	occupation?: string | null;
	identifier?: string | null;

	id: string;
	name: string;
	initials: string;
	photoUrl?: string | null;
	/** Raw guardian↔student relationship from API (display as-is). */
	relation: string;
	email: string;
	phone: string;
	studentIds: string[];
	preferredContact: 'email' | 'phone' | 'sms';
	subjectId?: string | null;
}

export type StaffRole
	= | 'owner'
		| 'directeur'
		| 'deputy_director'
		| 'studies_director'
		| 'educateur'
		| 'cpe'
		| 'secretary'
		| 'accountant'
		| 'it_admin'
		| 'staff';

export interface StaffMember {
	phone?: string | null;
	firstName?: string | null;
	lastName?: string | null;
	identifier?: string | null;

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
	firstName?: string | null;
	lastName?: string | null;
	sourceFullName?: string | null;

	id: string;
	name: string;
	initials: string;
	photoUrl?: string | null;
	email: string;
	phone: string;
	identifier?: string | null;
	isActive: boolean;
	subjectId?: string | null;
}

export type ChronicCondition = string;

export interface HealthRecord {
	medicalConditionsText?: string;
	allergiesText?: string;
	medicationsText?: string;
	emergencyProtocols?: string;
	id?: string;
	studentId: string;
	bloodType: string;
	allergies: string[];
	medications: string[];
	chronicConditions: ChronicCondition[];
	lastVisit: string;
	notes: string;
}

export type IncidentKind = 'positive' | 'minor_infraction' | 'major_infraction' | 'emergency';

export interface Incident {
	title?: string;
	description?: string;
	classGroupId?: string | null;
	lessonSessionId?: string | null;
	reporterId?: string | null;
	resolvedAt?: string | null;
	resolvedByStaffId?: string | null;
	resolutionNotes?: string | null;
	id: string;
	studentId: string;
	involvedStudentIds: string[];
	involvedCount: number;
	date: string;
	/** API incident kind — source of truth for tone. */
	kind: IncidentKind;
	/** Display grouping derived from `kind` only (no text NLP). */
	category: 'Behavior' | 'Tardiness' | 'Conflict' | 'Other';
	severity: 'low' | 'medium' | 'high';
	summary: string;
	status: 'open' | 'resolved' | 'cancelled';
}

export interface StudentEnrollmentHistoryItem {
	progressionDecision?: 'promoted' | 'retained' | 'graduated' | null;
	progressionDecidedAt?: string;
	progressionDecidedBy?: string | null;
	progressionNotes?: string | null;
	previousEnrollmentId?: string | null;
	closedBy?: string | null;
	enrollmentIndex?: number;
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

export type FeeCategory
	= | 'tuition'
		| 'transport'
		| 'meals'
		| 'activities'
		| 'materials'
		| 'other';

export type CatalogServiceStatus = 'draft' | 'active' | 'archived';
export type AutoBillingConfiguration = { mode: 'off' | 'all' } | { mode: 'matching'; gradeLevelIds: string[] | null; placementStatusIds: string[] | null };
export type StudentChargeStatus
	= | 'pending'
		| 'partial'
		| 'paid'
		| 'overdue'
		| 'cancelled'
		| 'waived';

export interface Fee {
	shortName?: string;
	academicYearId?: string;
	description?: string;
	billingTerms?: import('$lib/api/finance-types').OneTimeBillingTerms;

	id: string;
	name: string;
	category: FeeCategory;
	amount: number;
	currency: string;
	status: CatalogServiceStatus;
	autoBilling: AutoBillingConfiguration;
	installmentCount?: number;
}

export interface StudentBilling {
	classId?: string;
	studentName?: string;
	netAmount?: number;
	adjustmentAmount?: number;
	waiverAmount?: number;
	adjustmentReason?: string;
	adjustedAt?: string;
	adjustedById?: string;
	waiverReason?: string;
	waivedAt?: string;
	waivedById?: string;
	cancellationReason?: string;
	cancelledAt?: string;
	cancelledById?: string;
	createdAt?: string;
	accountId?: string;
	availableCredit?: number;
	accountHasOpenCharges?: boolean;
	overdue?: number;

	id: string;
	studentId: string;
	enrollmentId: string;
	catalogServiceId: string;
	label: string;
	total: number;
	paid: number;
	remaining: number;
	currency: string;
	status: StudentChargeStatus;
	dueDate: string;
	academicYearId: string;
	installments: { id: string; date: string; amount: number; label: string; status: 'paid' | 'partial' | 'pending'; applied?: number; remaining?: number }[];
}

export type AcademicYearStatus = 'draft' | 'published' | 'archived';

export type AcademicPublishStatus = AcademicYearStatus;

export type PeriodDefinitionDayOfWeek
	= | 'monday'
		| 'tuesday'
		| 'wednesday'
		| 'thursday'
		| 'friday'
		| 'saturday'
		| 'sunday';

export interface PeriodDefinition {
	shortName?: string;
	id: string;
	schoolId: string;
	academicYearId: string;
	label: string;
	dayOfWeek: PeriodDefinitionDayOfWeek;
	order: number;
	startTime: string;
	endTime: string;
	isBreak: boolean;
	isTeachingSlot: boolean;
}

export type GradingPolicy = NonNullable<components['schemas']['GradeLevel']['gradingPolicies']>[number];

export interface GradeLevel {
	gradingPolicies?: GradingPolicy[];
	id: string;
	schoolId: string;
	name: string;
	/** Stem used to build class names (`6ème` → `6ème 1`). */
	shortName: string;
	cycle: string;
	order: number;
}

export interface AcademicYear {
	shortName?: string;
	id: string;
	schoolId: string;
	label: string;
	startDate: string;
	endDate: string;
	status: AcademicYearStatus;
}

export interface AcademicPeriod {
	shortName?: string;
	type?: 'trimester' | 'semester' | 'other';
	id: string;
	schoolId: string;
	academicYearId: string;
	label: string;
	range: string;
	startDate: string;
	endDate: string;
	status: AcademicYearStatus;
}

export type TimetableGenerationMode = 'weekly' | 'free';

export interface School {
	financeCurrency?: string | null;
	id: string;
	name: string;
	shortName: string;
	city: string;
	country?: string;
	timeZone: string;
	timetableEnforceWorkloadFulfillment: boolean;
	timetableExcludeBreakSlots: boolean;
	timetableMinDayGapSameSubject: number;
	timetablePreferredPeriodDefinitionIds: string[];
	timetableAllowUnassignedTeacherPlacements: boolean;
	timetableUseHomeroomTeacherFallback: boolean;
	timetableGenerationMode: TimetableGenerationMode;
	timetableMinPeriodSpan: number;
	timetableMaxPeriodSpan: number;
	issuingName?: string | null;
	postalAddress?: string | null;
	phone?: string | null;
	email?: string | null;
	schoolCode?: string | null;
	logoAttachmentId?: string | null;
	crestAttachmentId?: string | null;
	stampAttachmentId?: string | null;
	signatureAttachmentId?: string | null;
	issuanceAssetVersion?: number;
	publicBrandingPurposes?: Array<'school.logo' | 'school.crest'>;
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
	/** When true, timetable generation skips these dates for the scoped class(es). */
	blocksTimetable?: boolean;
}

export interface PedagogicalNote {
	title?: string | null;
	visibility?: 'staff' | 'admin_only' | 'guardian_visible';
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
	shortName?: string;
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
