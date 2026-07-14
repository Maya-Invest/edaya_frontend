import type { components } from '$lib/api/schema';
import type { StaffPageState } from '../../../staff-page.svelte';
import { staffAssignmentsForStaff, uniqueIds } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { getContext, setContext } from 'svelte';
import { resolveStaffPageLoad } from '../../../lib/staff-page-status';
import { staffDetailIdFromUrl } from '../../../lib/staff-selectors';

type StaffAssignment = components['schemas']['StaffAssignment'];
type ClassSubject = components['schemas']['ClassSubject'];

const STAFF_ASSIGNMENTS_TAB_KEY = Symbol('staff-assignments-tab');

export interface StaffAssignmentsTabSlice {
	staffId: string;
	assignments: StaffAssignment[];
	classSubjects: ClassSubject[];
}

export class StaffAssignmentsTabState {
	slice = $state<StaffAssignmentsTabSlice | null>(null);

	constructor(private readonly getPage: () => StaffPageState) {}

	clear() {
		this.slice = null;
	}

	assignmentsFor(staffId: string): StaffAssignment[] {
		return this.slice?.staffId === staffId ? this.slice.assignments : [];
	}

	classSubjectsFor(staffId: string): ClassSubject[] {
		return this.slice?.staffId === staffId ? this.slice.classSubjects : [];
	}

	query() {
		return (url: URL) => resolveStaffPageLoad(url, {
			empty: () => ({}),
			load: async () => {
				const staffId = staffDetailIdFromUrl(url);
				if (!staffId) {
					return {};
				}

				const client = getBrowserSchoolClient();
				const assignments = await client.entities.staffAssignments.list(
					staffAssignmentsForStaff([staffId]),
				);
				const classSubjectIds = uniqueIds(
					(assignments ?? []).map(row => row.classSubjectId).filter((id): id is string => Boolean(id)),
				);
				const classSubjects = classSubjectIds.length
					? await client.entities.classSubjects.list({ id: { $in: classSubjectIds } })
					: [];

				this.slice = {
					staffId,
					assignments: assignments ?? [],
					classSubjects: classSubjects ?? [],
				};
				return {};
			},
			hasItems: () => true,
			errorMessage: 'Unable to load staff assignments.',
		});
	}
}

export function setStaffAssignmentsTabState(state: StaffAssignmentsTabState) {
	setContext(STAFF_ASSIGNMENTS_TAB_KEY, state);
}

export function getStaffAssignmentsTabState() {
	return getContext<StaffAssignmentsTabState>(STAFF_ASSIGNMENTS_TAB_KEY);
}
