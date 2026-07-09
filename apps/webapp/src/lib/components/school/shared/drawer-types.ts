import type { ReportCardDefinition, ReportCardResult } from '$lib/types/report-cards';
import type {
	ClassNode,
	GradeLevel,
	Student,
	Subject,
	PlanningEvent,
	Evaluation,
	Guardian,
	StaffMember,
	Teacher,
	StudentBilling,
	SchoolYearEvent,
	Incident,
	Activity,
	Announcement,
	AttendanceDay,
} from '$lib/types/school';

export type DrawerItem
	= | { kind: 'student'; data: Student }
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
		| { kind: 'reportCardDefinition'; data: ReportCardDefinition }
		| { kind: 'reportCardResult'; data: ReportCardResult }
		| { kind: 'gradeLevel'; data: GradeLevel }
		| { kind: 'classGroup'; data: ClassNode }
		| null;

export interface SubjectGroupItem { e: Evaluation; mark: number | null; href?: string }
