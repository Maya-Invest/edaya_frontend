import type { FamilyFeedbackCampaign } from '$lib/api/family-feedback-types';
import type { ReportCardResult } from '$lib/types/report-cards';
import type {
	Activity,
	Announcement,
	AttendanceDay,
	ClassNode,
	Evaluation,
	GradeLevel,
	Guardian,
	Incident,
	PlanningEvent,
	SchoolYearEvent,
	StaffMember,
	Student,
	StudentBilling,
	Subject,
	Teacher,
} from '$lib/types/school';

export type DrawerItem
	= | { kind: 'student'; data: Student }
		| { kind: 'catalogSubject'; data: Subject }
		| { kind: 'subject'; data: Subject }
		| { kind: 'planning'; data: PlanningEvent }
		| { kind: 'evaluation'; data: Evaluation }
		| { kind: 'attendanceDay'; data: AttendanceDay }
		| { kind: 'guardian'; data: Guardian }
		| { kind: 'staff'; data: StaffMember }
		| { kind: 'teacher'; data: Teacher }
		| { kind: 'billing'; data: StudentBilling }
		| { kind: 'schoolYearEvent'; data: SchoolYearEvent }
		| { kind: 'incident'; data: Incident }
		| { kind: 'level'; data: { label: string; subtitle: string; items: Subject[] } }
		| { kind: 'activity'; data: Activity }
		| { kind: 'announcement'; data: Announcement }
		| { kind: 'familyFeedback'; data: FamilyFeedbackCampaign }
		| { kind: 'reportCardResult'; data: ReportCardResult }
		| { kind: 'gradeLevel'; data: GradeLevel }
		| { kind: 'classGroup'; data: ClassNode }
		| null;

export interface SubjectGroupItem { e: Evaluation; mark: number | null; href?: string }
