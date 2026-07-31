import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { AttendanceDay } from '$lib/types/school';
import type { AttendancePageSlice } from './lib/attendance-helpers';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import {
	attendanceClassIdFromUrl,
	attendanceDayDetailIdFromUrl,
	emptyAttendanceSlice,
} from './lib/attendance-helpers';
import { loadAttendanceSlice, queryAttendanceListPage } from './lib/attendance-queries';

const ATTENDANCE_VERSION_FAMILIES = ['attendance', 'students'] as const satisfies readonly EntityVersionKey[];

const ATTENDANCE_PAGE_STATE_KEY = Symbol('attendance-page-state');

export type { AttendancePageSlice };

export class AttendancePageState {
	slice = $state<AttendancePageSlice | null>(null);

	private readonly versions = new RouteVersionSnapshot(ATTENDANCE_VERSION_FAMILIES);

	constructor(private readonly getUrl: () => URL) {}

	applySlice(classId: string, data: Partial<Omit<AttendancePageSlice, 'classId'>>) {
		this.slice = { ...emptyAttendanceSlice(classId), ...data, classId };
		this.versions.markLoaded();
	}

	seed(classId: string, data: Partial<Omit<AttendancePageSlice, 'classId'>>) {
		if (this.slice?.classId === classId) {
			return;
		}
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
		const data = await loadAttendanceSlice(classId);
		this.applySlice(classId, data);
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
