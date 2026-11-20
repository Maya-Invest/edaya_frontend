import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { PageLoadState } from '$lib/page/load-state';
import type { AttendanceDay } from '$lib/types/school';
import type { SessionAttendanceRow, SessionAttendanceStatus } from '$lib/types/session-detail';
import type { AttendancePageSlice } from './lib/attendance-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { findAttendanceDayForDate, loadAttendanceRoster } from '$lib/api/attendance-data';
import { requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { isoToZonedDateAndTime, nowIso } from '$lib/date/format';
import { t } from '$lib/i18n';
import { createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
import { TASK_QUERY_KEYS } from '$lib/modal/modal-url';
import { replaceRouteSurface } from '$lib/navigation/route-surface-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { hasPermission } from '$lib/permissions';
import { toast } from '$lib/toast.svelte';
import { ApiError } from '@maya-invest/edaya-api-client';
import { getContext, setContext } from 'svelte';
import { get } from 'svelte/store';
import {
	attendanceClassIdFromUrl,
	attendanceDayDetailIdFromUrl,
	emptyAttendanceSlice,
} from './lib/attendance-helpers';
import { loadAttendanceSlice, queryAttendanceListPage } from './lib/attendance-queries';
import { runAttendanceRouteMutation } from './lib/attendance-route-mutation';
import { canonicalAttendanceTaskHref } from './lib/attendance-task';
import { completeRollCall, validRollCallDate } from './lib/roll-call';

const ATTENDANCE_VERSION_FAMILIES = ['attendance', 'students', 'guardians', 'enrollments'] as const satisfies readonly EntityVersionKey[];

const ATTENDANCE_PAGE_STATE_KEY = Symbol('attendance-page-state');

export type { AttendancePageSlice };

export class AttendancePageState {
	performRequestDocumentIssuance = (...args: Parameters<typeof requestDocumentIssuanceMutation>) => requestDocumentIssuanceMutation(...args);

	slice = $state<AttendancePageSlice | null>(null);

	private readonly versions = new RouteVersionSnapshot(ATTENDANCE_VERSION_FAMILIES);

	readonly modals;
	roster = $state<SessionAttendanceRow[]>([]);
	rosterLoading = $state(false);
	rosterError = $state(false);
	rosterStatus = $state<PageLoadState>('loading');
	creationOutcome = $state<'failed' | 'saved' | 'saved-refresh-failed' | 'duplicate' | null>(null);
	existingCreationDay = $state<AttendanceDay | null>(null);
	creating = $state(false);
	private rosterRequest = 0;
	private rosterScope = '';

	constructor(private readonly getUrl: () => URL) {
		this.modals = createUrlSyncedModals({
			allowed: ['attendance-roll-call'],
			owned: ['attendance-roll-call'],
			allowedTabs: ['create'],
			queryKeys: TASK_QUERY_KEYS,
			getUrl,
		});
	}

	hydrateTask() {
		const href = canonicalAttendanceTaskHref(this.getUrl());
		if (href) {
			replaceRouteSurface(href);
			return;
		}
		this.modals.hydrate();
	}

	openCreationTask() {
		this.modals.open('attendance-roll-call', { tab: 'create' });
	}

	get timeZone() {
		return academicContext.schools.find(row => row.id === this.classNode?.schoolId)?.timeZone ?? 'UTC';
	}

	get classId() {
		return attendanceClassIdFromUrl(this.getUrl()) ?? '';
	}

	get scope() {
		return `${authSession.userId}|${academicContext.schoolScopeId}|${academicContext.yearId}|${this.classId}`;
	}

	get classNode() {
		return academicContext.classes.find(row => row.id === this.classId);
	}

	get canCreate() {
		return this.classNode?.attendanceMode === 'daily'
			&& hasPermission('ATTENDANCE_RECORD', { classId: this.classId });
	}

	get today() {
		return isoToZonedDateAndTime(nowIso(), this.timeZone).date;
	}

	cancelRosterLoad() {
		this.rosterRequest += 1;
		this.rosterScope = '';
		this.roster = [];
		this.rosterLoading = false;
		this.rosterError = false;
		this.rosterStatus = 'loading';
	}

	async loadCreationRoster() {
		const request = ++this.rosterRequest;
		const scope = this.scope;
		this.roster = [];
		this.rosterScope = '';
		this.rosterError = false;
		if (!this.canCreate) {
			this.rosterLoading = false;
			this.rosterStatus = this.classNode?.attendanceMode === 'daily' ? 'denied' : 'unavailable';
			return;
		}
		this.rosterStatus = 'loading';
		this.rosterLoading = true;
		try {
			const rows = await loadAttendanceRoster(getBrowserSchoolClient(), this.classId);
			if (request === this.rosterRequest && scope === this.scope) {
				this.roster = rows;
				this.rosterScope = scope;
				this.rosterStatus = rows.length ? 'ready' : 'empty';
			}
		}
		catch (error) {
			if (request === this.rosterRequest && scope === this.scope) {
				this.rosterError = true;
				this.rosterStatus = error instanceof ApiError && error.status === 403 ? 'denied' : error instanceof ApiError && error.status === 404 ? 'unavailable' : 'error';
			}
		}
		finally {
			if (request === this.rosterRequest && scope === this.scope) {
				this.rosterLoading = false;
			}
		}
	}

	async createRollCall(date: string, marks: Record<string, SessionAttendanceStatus>): Promise<AttendanceDay | null> {
		if (this.creating || !this.canCreate || this.rosterLoading || this.rosterError
			|| this.rosterScope !== this.scope || !validRollCallDate(date, this.today)
			|| !completeRollCall(this.roster, marks)) {
			return null;
		}
		this.creating = true;
		this.creationOutcome = null;
		this.existingCreationDay = null;
		const scope = this.scope;
		const rosterRequest = this.rosterRequest;
		const classId = this.classId;
		const client = getBrowserSchoolClient();
		const attendanceByStudent = Object.fromEntries(this.roster.map(row => [row.studentId, marks[row.studentId]]));
		try {
			const existing = await findAttendanceDayForDate(client, classId, date);
			if (scope !== this.scope || rosterRequest !== this.rosterRequest || !this.canCreate) {
				return null;
			}
			if (existing) {
				this.existingCreationDay = existing;
				this.creationOutcome = 'duplicate';
				try {
 await this.refreshSlice(classId);
 }
				catch { /* The exact duplicate remains available even if the list refresh fails. */ }
				toast.error(get(t)('attendanceDay.alreadyExists'));
				return null;
			}
			const day: AttendanceDay = {
				id: `${classId}:${date}`,
				classId,
				date,
				label: get(t)('attendanceDay.dailyRollCall'),
				totalStudents: this.roster.length,
				recordedCount: this.roster.length,
			};
			const previous = this.slice;
			const result = await runAttendanceRouteMutation({
				request: () => client.commands.recordClassDailyAttendance({
					classGroupId: classId,
					date,
					attendanceByStudent,
					createdAt: nowIso(),
				}),
				apply: () => {
					this.slice = { classId, attendanceDays: [day, ...this.daysFor(classId)].sort((a, b) => b.date.localeCompare(a.date)) };
				},
				rollback: () => {
					if (scope === this.scope) {
						this.slice = previous;
					}
				},
				onSuccess: async () => {
					if (scope === this.scope && rosterRequest === this.rosterRequest) {
						this.creationOutcome = 'saved';
						try {
 await this.refreshSlice(classId);
 }
						catch (error) {
							if (scope === this.scope && rosterRequest === this.rosterRequest)
								this.creationOutcome = 'saved-refresh-failed';
							throw error;
						}
					}
				},
				successMessage: get(t)('attendanceDay.bulkSuccess'),
			});
			if (result === null && scope === this.scope && rosterRequest === this.rosterRequest)
				this.creationOutcome = 'failed';
			return result !== null && scope === this.scope && rosterRequest === this.rosterRequest ? day : null;
		}
		catch {
			if (scope === this.scope && rosterRequest === this.rosterRequest) {
				this.creationOutcome = 'failed';
				toast.error(get(t)('attendanceDay.createFailed'));
			}
			return null;
		}
		finally {
			this.creating = false;
		}
	}

	applySlice(classId: string, data: Partial<Omit<AttendancePageSlice, 'classId'>>) {
		this.slice = { ...emptyAttendanceSlice(classId), ...data, classId };
		this.versions.markLoaded();
	}

	seed(classId: string, data: Partial<Omit<AttendancePageSlice, 'classId'>>) {
		this.applySlice(classId, data);
	}

	clear() {
		this.slice = null;
	}

	get selectedId() {
		return attendanceDayDetailIdFromUrl(this.getUrl());
	}

	get selected() {
		const classId = attendanceClassIdFromUrl(this.getUrl());
		if (!classId) {
			return undefined;
		}
		return this.selectedDay(classId, this.selectedId);
	}

	daysFor(classId: string): AttendanceDay[] {
		return this.slice?.classId === classId ? this.slice.attendanceDays : [];
	}

	selectedDay(classId: string, dayId?: string) {
		if (!dayId || this.slice?.classId !== classId) {
			return undefined;
		}
		return this.slice.attendanceDays.find(day => day.id === dayId);
	}

	patchAttendanceDay(id: string, patch: Partial<AttendanceDay>) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			attendanceDays: this.slice.attendanceDays.map(day =>
				day.id === id ? { ...day, ...patch } : day,
		),
		};
	}

	queryListPage(classId: string) {
		return queryAttendanceListPage(classId, this);
	}

	async refreshSlice(classId: string) {
		const scope = this.scope;
		const data = await loadAttendanceSlice(classId);
		if (scope === this.scope) {
			this.applySlice(classId, data);
		}
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		const classId = this.slice?.classId ?? attendanceClassIdFromUrl(this.getUrl());
		if (!classId) {
			return;
		}
		await this.refreshSlice(classId);
	}
}

export function setAttendancePageState(state: AttendancePageState) {
	setContext(ATTENDANCE_PAGE_STATE_KEY, state);
}

export function getAttendancePageState() {
	return getContext<AttendancePageState>(ATTENDANCE_PAGE_STATE_KEY);
}
