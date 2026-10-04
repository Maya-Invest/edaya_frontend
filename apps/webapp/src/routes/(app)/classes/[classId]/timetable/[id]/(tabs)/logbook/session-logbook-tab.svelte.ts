import type { SessionDetail, SessionLogbook, SessionSubjectMatterOption } from '$lib/types/session-detail';
import type { PageQueryRequest } from '../../../lib/timetable-page-status';
import type { TimetablePageState } from '../../../timetable-page.svelte';
import { buildLessonSessionSavePayload } from '$lib/api/lesson-session-save-payload';
import { findPlanningEventById } from '$lib/api/planning-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadPlanningOccurrenceDetail } from '$lib/api/session-detail-data';
import { nowIso } from '$lib/date/format';
import { t } from '$lib/i18n';
import { queryClient } from '$lib/queries/client';
import { getContext, setContext } from 'svelte';
import { get } from 'svelte/store';
import {
	sessionDetailIdFromUrl,
	timetableClassIdFromUrl,
} from '../../../lib/timetable-helpers';
import { resolveTimetablePageLoad } from '../../../lib/timetable-page-status';
import { runTimetableRouteMutation } from '../../../lib/timetable-route-mutation';

const SESSION_LOGBOOK_TAB_KEY = Symbol('session-logbook-tab');

export interface SessionLogbookTabSlice {
	sessionId: string;
	classGroupId: string;
	classSubjectId: string;
	date: string;
	subjectMatters: SessionSubjectMatterOption[];
	logbook?: SessionLogbook;
}

function emptySlice(sessionId: string): SessionLogbookTabSlice {
	return {
		sessionId,
		classGroupId: '',
		classSubjectId: '',
		date: '',
		subjectMatters: [],
	};
}

export class SessionLogbookTabState {
	slice = $state<SessionLogbookTabSlice | null>(null);
	private validateSurface?: (logbookExists: boolean) => void;

	constructor(private readonly getPage: () => TimetablePageState) {}

	configureSurfaceValidation(validate: (logbookExists: boolean) => void) {
		this.validateSurface = validate;
		if (this.slice) {
			validate(this.slice.logbook !== undefined);
		}
	}

	clear() {
		this.slice = null;
	}

	seed(sessionId: string, data: Omit<SessionLogbookTabSlice, 'sessionId'>) {
		if (!this.slice || this.slice.sessionId !== sessionId) {
			this.slice = { ...emptySlice(sessionId), ...data, sessionId };
			this.validateSurface?.(data.logbook !== undefined);
			return;
		}
		this.slice = { ...this.slice, ...data, sessionId };
		this.validateSurface?.(data.logbook !== undefined);
	}

	detailFor(sessionId: string): SessionDetail | undefined {
		const slice = this.slice?.sessionId === sessionId ? this.slice : undefined;
		if (!slice) {
			return undefined;
		}
		return {
			sessionId: slice.sessionId,
			classGroupId: slice.classGroupId,
			classSubjectId: slice.classSubjectId,
			date: slice.date,
			attendance: [],
			subjectMatters: slice.subjectMatters,
			logbook: slice.logbook,
		};
	}

	patchLogbook(sessionId: string, logbook: SessionLogbook | undefined) {
		if (this.slice?.sessionId !== sessionId) {
			return;
		}
		this.slice = { ...this.slice, logbook };
	}

	query() {
		return (url: URL, request?: PageQueryRequest) => resolveTimetablePageLoad(url, {
			empty: () => ({}),
			load: async (signal) => {
				const sessionId = sessionDetailIdFromUrl(url);
				const classId = timetableClassIdFromUrl(url);
				if (!sessionId || !classId) {
					return {};
				}

				const page = this.getPage();
				const session = page.selectedSession(classId, sessionId)
					?? findPlanningEventById(page.events, sessionId);
				if (!session) {
					return {};
				}

				const loaded = await loadPlanningOccurrenceDetail(
					queryClient(),
					{ id: session.id, kind: session.kind },
				);
				if (loaded) {
					signal.throwIfAborted();
					this.seed(sessionId, {
						classGroupId: loaded.classGroupId,
						classSubjectId: loaded.classSubjectId,
						date: loaded.date,
						subjectMatters: loaded.subjectMatters,
						logbook: loaded.logbook,
					});
				}
				return {};
			},
			hasItems: () => true,
			errorMessage: 'Unable to load session logbook.',
		}, request);
	}

	async validateLogbook(sessionIds: string[]): Promise<boolean> {
		const result = await runTimetableRouteMutation({ request: () => getBrowserSchoolClient().commands.validateTeacherLogbook({ requestId: crypto.randomUUID(), lessonSessionIds: sessionIds }), successMessage: get(t)('corrections.validateLogbook') });
		return result !== null;
	}

	async saveLogbook(input: {
		sessionId: string;
		classGroupId: string;
		classSubjectId: string;
		date: string;
		logbookId?: string;
		classSubjectMatterId: string;
		chapter: string;
		content: string;
		notes: string;
		progress: number;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const progressId = input.logbookId ?? `csp-${input.sessionId}-${Date.now().toString(36)}`;
		const nextLogbook: SessionLogbook = {
			id: progressId,
			chapter: input.chapter.trim(),
			content: input.content.trim(),
			notes: input.notes.trim(),
			progress: input.progress,
		};
		const previous = this.slice?.sessionId === input.sessionId ? this.slice.logbook : undefined;

		const result = await runTimetableRouteMutation({
			request: async () => {
				const session = await client.entities.lessonSessions.get(input.sessionId);
				await client.entities.lessonSessions.save(
					buildLessonSessionSavePayload(session, {
						displayLabel: session.displayLabel,
						sessionNote: input.content.trim() || null,
					}),
				);
				await client.commands.recordLessonSessionProgress({
					id: progressId,
					classSubjectMatterId: input.classSubjectMatterId,
					lessonSessionId: input.sessionId,
					completedPercentage: input.progress,
					notes: input.notes.trim() || null,
					recordedAt: nowIso(),
				});
			},
			successMessage: input.successMessage ?? get(t)('planning.session.logbookSuccess'),
			apply: () => {
				this.patchLogbook(input.sessionId, nextLogbook);
			},
			rollback: () => {
				this.patchLogbook(input.sessionId, previous);
			},
		});
		return result !== null;
	}
}

export function setSessionLogbookTabState(state: SessionLogbookTabState) {
	setContext(SESSION_LOGBOOK_TAB_KEY, state);
}

export function getSessionLogbookTabState() {
	return getContext<SessionLogbookTabState>(SESSION_LOGBOOK_TAB_KEY);
}
