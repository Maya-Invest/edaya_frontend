import type { SessionAttendanceRow, SessionAttendanceStatus } from '$lib/types/session-detail';
import { detailHref } from '$lib/detail-hrefs';
import { TASK_QUERY_KEYS, writeModalSurface } from '$lib/modal/modal-url';
import { detailNavigationSearch } from '$lib/navigation/detail-navigation';

export function sessionAttendanceTaskHref(url: URL, classId: string, sessionId: string): string {
	const detail = new URL(`${detailHref.classPlanningTab(classId, sessionId, 'attendance')}${detailNavigationSearch(url)}`, url);
	return writeModalSurface(detail, { modal: 'attendance-roll-call', target: sessionId, tab: 'session' }, TASK_QUERY_KEYS);
}

export interface AttendanceSaveProgress {
	saved: string[];
	failed: string[];
	remaining: string[];
}

/** Retains the command's actual save unit. A retry submits only draft/baseline differences. */
export async function saveAttendanceDraft(input: {
	rows: readonly SessionAttendanceRow[];
	draft: Record<string, SessionAttendanceStatus>;
	baseline: Partial<Record<string, SessionAttendanceStatus>>;
	canContinue: () => boolean;
	saveBatch?: (marks: Record<string, SessionAttendanceStatus>) => Promise<boolean>;
	saveRow: (row: SessionAttendanceRow, status: SessionAttendanceStatus) => Promise<boolean>;
	onSaved: (marks: Record<string, SessionAttendanceStatus>) => void;
}): Promise<AttendanceSaveProgress> {
	const changed = input.rows.filter(row => input.draft[row.studentId] && input.draft[row.studentId] !== input.baseline[row.studentId]);
	const progress: AttendanceSaveProgress = { saved: [], failed: [], remaining: changed.map(row => row.studentId) };
	if (!changed.length || !input.canContinue())
		return progress;
	if (input.saveBatch) {
		const marks = Object.fromEntries(changed.map(row => [row.studentId, input.draft[row.studentId]]));
		if (await input.saveBatch(marks)) {
			progress.saved = changed.map(row => row.studentId);
			progress.remaining = [];
			input.onSaved(marks);
		}
		else {
			progress.failed = [...progress.remaining];
		}
		return progress;
	}
	for (const row of changed) {
		if (!input.canContinue())
			break;
		if (await input.saveRow(row, input.draft[row.studentId])) {
			progress.saved.push(row.studentId);
			progress.remaining = progress.remaining.filter(id => id !== row.studentId);
			input.onSaved({ [row.studentId]: input.draft[row.studentId] });
		}
		else {
			progress.failed.push(row.studentId);
		}
	}
	return progress;
}
