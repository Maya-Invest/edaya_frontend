import type { ReportCardDefinition, ReportCardResult } from '$lib/types/report-cards';
import type {
	Student,
	Subject,
	PlanningEvent,
	Evaluation,
	Guardian,
	StaffMember,
	Deadline,
	StudentBilling,
	Fee,
	SchoolYearEvent,
	Incident,
	Activity,
	Announcement,
} from '$lib/types/school';

export type DrawerItem
	= | { kind: 'student'; data: Student }
		| { kind: 'subject'; data: Subject }
		| { kind: 'planning'; data: PlanningEvent }
		| { kind: 'evaluation'; data: Evaluation }
		| { kind: 'guardian'; data: Guardian }
		| { kind: 'staff'; data: StaffMember }
		| { kind: 'deadline'; data: Deadline }
		| { kind: 'billing'; data: StudentBilling }
		| { kind: 'fee'; data: Fee }
		| { kind: 'schoolYearEvent'; data: SchoolYearEvent }
		| { kind: 'incident'; data: Incident }
		| { kind: 'staffPermissions'; data: StaffMember }
		| { kind: 'level'; data: { label: string; subtitle: string; items: Subject[] } }
		| { kind: 'activity'; data: Activity }
		| { kind: 'announcement'; data: Announcement }
		| { kind: 'reportCardDefinition'; data: ReportCardDefinition }
		| { kind: 'reportCardResult'; data: ReportCardResult }
		| null;

export interface SubjectGroupItem { e: Evaluation; mark: number | null }
