export type SessionAttendanceStatus = 'present' | 'absent' | 'late';

export type SessionSubjectMatterStatus = 'not_started' | 'in_progress' | 'completed';

export interface SessionSubjectMatterOption {
	id: string;
	name: string;
	sequenceOrder: number;
	status: SessionSubjectMatterStatus;
	completedPercentage: number;
}

export interface SessionChapter {
	matterId: string;
	name: string;
	completed: boolean | null;
	notes?: string | null;
}

export interface LogbookSave {
	sessionId: string;
	requestId: string;
	expectedVersion: number;
	sessionNote: string | null;
	progress: { matterId: string; completed: boolean; notes?: string | null }[];
	reason?: string;
	correctionId?: string;
}

export interface SessionLogbook {
	chapters?: SessionChapter[];
	id: string;
	content: string;
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
