export type SessionAttendanceStatus = 'present' | 'absent' | 'late';

export type SessionSubjectMatterStatus = 'not_started' | 'in_progress' | 'completed';

export interface SessionSubjectMatterOption {
	id: string;
	name: string;
	sequenceOrder: number;
	status: SessionSubjectMatterStatus;
	completedPercentage: number;
}

export interface SessionLogbook {
	id: string;
	chapter: string;
	content: string;
	/** Progress / session notes (API: ClassSubjectProgress.notes / sessionNote). */
	notes: string;
	progress: number;
}

export interface SessionAttendanceRow {
	studentId: string;
	studentName: string;
	studentInitials: string;
	attendanceId?: string;
	status?: SessionAttendanceStatus;
}

export interface SessionDetail {
	sessionId: string;
	classGroupId: string;
	classSubjectId: string;
	date: string;
	attendance: SessionAttendanceRow[];
	subjectMatters: SessionSubjectMatterOption[];
	logbook?: SessionLogbook;
}
