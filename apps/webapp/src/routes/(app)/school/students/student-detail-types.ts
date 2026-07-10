import type {
	AbsenceRecord,
	AssessmentResultRow,
	Evaluation,
	Fee,
	Guardian,
	HealthRecord,
	Incident,
	PedagogicalNote,
	StaffMember,
	Student,
	StudentAttendanceHistoryItem,
	StudentBilling,
	StudentEnrollmentHistoryItem,
	StudentGradeRow,
} from '$lib/types/school';
import type { GradeScale, ReportCardDefinition, ReportCardResult } from '$lib/types/report-cards';

export interface StudentDetailSlice {
	studentId: string;
	health?: HealthRecord;
	pedagogicalNotes: PedagogicalNote[];
	guardians: Guardian[];
	staff: StaffMember[];
	grades: StudentGradeRow[];
	evaluations: Evaluation[];
	assessmentResults: AssessmentResultRow[];
	absences: AbsenceRecord[];
	attendance: StudentAttendanceHistoryItem[];
	incidents: Incident[];
	fees: Fee[];
	billing: StudentBilling[];
	enrollments: StudentEnrollmentHistoryItem[];
	reportCardResults: ReportCardResult[];
	gradeScales: GradeScale[];
	reportCardDefinitions: ReportCardDefinition[];
}

export function emptyStudentDetailSlice(studentId: string): StudentDetailSlice {
	return {
		studentId,
		pedagogicalNotes: [],
		guardians: [],
		staff: [],
		grades: [],
		evaluations: [],
		assessmentResults: [],
		absences: [],
		attendance: [],
		incidents: [],
		fees: [],
		billing: [],
		enrollments: [],
		reportCardResults: [],
		gradeScales: [],
		reportCardDefinitions: [],
	};
}

export type StudentDetailSeed = Partial<Omit<StudentDetailSlice, 'studentId'>>;
