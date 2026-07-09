import type { SessionDetail } from '$lib/types/session-detail';

class SessionDetailContext {
	private detailsBySession = $state<Record<string, SessionDetail>>({});

	get(sessionId: string): SessionDetail | undefined {
		return this.detailsBySession[sessionId];
	}

	hydrate(sessionId: string, detail: SessionDetail) {
		this.detailsBySession = { ...this.detailsBySession, [sessionId]: detail };
	}

	patchAttendance(
		sessionId: string,
		studentId: string,
		patch: Partial<SessionDetail['attendance'][number]>,
	) {
		const detail = this.detailsBySession[sessionId];
		if (!detail) {
			return;
		}
		this.detailsBySession = {
			...this.detailsBySession,
			[sessionId]: {
				...detail,
				attendance: detail.attendance.map(row =>
					row.studentId === studentId ? { ...row, ...patch } : row,
				),
			},
		};
	}

	patchLogbook(sessionId: string, logbook: SessionDetail['logbook']) {
		const detail = this.detailsBySession[sessionId];
		if (!detail) {
			return;
		}
		this.detailsBySession = {
			...this.detailsBySession,
			[sessionId]: { ...detail, logbook },
		};
	}

	clearSession(sessionId: string) {
		const { [sessionId]: _, ...rest } = this.detailsBySession;
		this.detailsBySession = rest;
	}

	reset() {
		this.detailsBySession = {};
	}
}

export const sessionDetailContext = new SessionDetailContext();
