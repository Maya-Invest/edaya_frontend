import type { components } from '$lib/api/schema';
import type { PageQueryRequest } from '$lib/queries/page-status';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { resolvePageLoad } from '$lib/queries/page-status';

export class AttendanceReviewState {
    record = $state<components['schemas']['Attendance'] | null>(null);
    busy = $state(false);
    query(id: string, url: URL, request?: PageQueryRequest) {
        return resolvePageLoad(url, { empty: () => ({}), hasItems: () => true, load: async (signal) => {
                const row = await getBrowserSchoolClient().entities.attendance.get(id);
                signal.throwIfAborted();
                this.record = row;
                return {};
            } }, request);
    }

    async save(decision: 'excused' | 'rejected', reason: string, notes: string) {
        if (!this.record)
            return false;
        this.busy = true;
        try {
            const { studentId, attendanceId, lessonSessionId, activitySessionId, assessmentId } = this.record;
            const row = await runMutation(() => getBrowserSchoolClient().commands.reviewAttendanceJustification({ studentId, attendanceId: attendanceId ?? undefined, lessonSessionId: lessonSessionId ?? undefined, activitySessionId: activitySessionId ?? undefined, assessmentId: assessmentId ?? undefined, decision, reason: reason.trim(), notes: notes.trim() || null }), { versionKeys: ['attendance', 'students', 'planning'] });
            if (!row)
                return false;
            this.record = row;
            return true;
        }
        finally {
            this.busy = false;
        }
    }
}
