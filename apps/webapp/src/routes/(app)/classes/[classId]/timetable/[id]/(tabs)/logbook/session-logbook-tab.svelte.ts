import type { LogbookSave, SessionDetail, SessionLogbook, SessionSubjectMatterOption } from '$lib/types/session-detail';
import type { PageQueryRequest } from '../../../lib/timetable-page-status';
import type { TimetablePageState } from '../../../timetable-page.svelte';
import { findPlanningEventById } from '$lib/api/planning-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadPlanningOccurrenceDetail } from '$lib/api/session-detail-data';
import { authSession } from '$lib/auth/session.svelte';
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

	async loadLogbook(targetId: string) {
		const state = await getBrowserSchoolClient().queries.getTeacherWorkflowState({ proposal: { workflow: 'logbook', formatVersion: 2, targetId, sessionNote: null, progress: [] } });
		const pending = state.corrections.find(row => row.status === 'pending');
		return { ...state, editable: !pending || pending.authorSubjectId === authSession.subjectId };
	}

	async validateLogbook(sessionIds: string[]): Promise<boolean> {
		const result = await runTimetableRouteMutation({ request: () => getBrowserSchoolClient().commands.validateTeacherLogbook({ requestId: crypto.randomUUID(), lessonSessionIds: sessionIds }), successMessage: get(t)('corrections.validateLogbook') });
		return result !== null;
	}

	async saveLogbook(input: LogbookSave): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const proposal = { workflow: 'logbook' as const, formatVersion: 2 as const, targetId: input.sessionId, sessionNote: input.sessionNote, progress: input.progress };
		const body = { requestId: input.requestId, expectedVersion: input.expectedVersion, proposal };
		const result = await runTimetableRouteMutation({
			request: async () => {
				if (input.reason && input.correctionId)
					await client.commands.reviseTeacherCorrection({ ...body, reason: input.reason, correctionId: input.correctionId });
				else if (input.reason)
					await client.commands.requestTeacherCorrection({ ...body, reason: input.reason });
				else
					await client.commands.saveTeacherLogbook(body);
				return true;
			},
			versionKeys: ['planning', 'subjects'],
			successMessage: get(t)('planning.session.logbookSuccess'),
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
