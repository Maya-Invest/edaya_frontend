import type { components } from '$lib/api/schema';
import type { TeachersPageState } from '../../../teachers-page.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { getContext, setContext } from 'svelte';
import { resolveTeacherPageLoad } from '../../../lib/teacher-page-status';
import { teacherDetailIdFromUrl } from '../../../lib/teacher-selectors';

type TeacherUnavailability = components['schemas']['TeacherUnavailability'];

const TEACHER_AVAILABILITY_TAB_KEY = Symbol('teacher-availability-tab');

export interface TeacherAvailabilityTabSlice {
	teacherId: string;
	unavailabilities: TeacherUnavailability[];
}

export class TeacherAvailabilityTabState {
	slice = $state<TeacherAvailabilityTabSlice | null>(null);

	constructor(private readonly getPage: () => TeachersPageState) {}

	clear() {
		this.slice = null;
	}

	unavailabilitiesFor(teacherId: string): TeacherUnavailability[] {
		return this.slice?.teacherId === teacherId ? this.slice.unavailabilities : [];
	}

	upsert(row: TeacherUnavailability) {
		if (!this.slice || this.slice.teacherId !== row.teacherId) {
			return;
		}
		const index = this.slice.unavailabilities.findIndex(entry => entry.id === row.id);
		if (index >= 0) {
			const next = [...this.slice.unavailabilities];
			next[index] = row;
			this.slice = { ...this.slice, unavailabilities: next };
			return;
		}
		this.slice = {
			...this.slice,
			unavailabilities: [...this.slice.unavailabilities, row],
		};
	}

	remove(id: string) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			unavailabilities: this.slice.unavailabilities.filter(row => row.id !== id),
		};
	}

	replaceForTeacher(teacherId: string, unavailabilities: TeacherUnavailability[]) {
		this.slice = { teacherId, unavailabilities };
	}

	query() {
		return (url: URL) => resolveTeacherPageLoad(url, {
			empty: () => ({}),
			load: async () => {
				const teacherId = teacherDetailIdFromUrl(url);
				if (!teacherId) {
					return {};
				}

				const page = this.getPage();
				const academicYearId = page.teacherScope().academicYearId;
				const unavailabilities = academicYearId
					? await getBrowserSchoolClient().entities.teacherUnavailabilities.list({
							teacherId,
							academicYearId,
							$orderBy: [{ field: 'effectiveFrom', direction: 'asc' }],
						})
					: [];

				this.slice = { teacherId, unavailabilities: unavailabilities ?? [] };
				page.seedTeacherUnavailabilities(teacherId, unavailabilities ?? []);
				return {};
			},
			hasItems: () => true,
			errorMessage: 'Unable to load teacher availability.',
		});
	}
}

export function setTeacherAvailabilityTabState(state: TeacherAvailabilityTabState) {
	setContext(TEACHER_AVAILABILITY_TAB_KEY, state);
}

export function getTeacherAvailabilityTabState() {
	return getContext<TeacherAvailabilityTabState>(TEACHER_AVAILABILITY_TAB_KEY);
}
