import type { components } from '$lib/api/schema';
import type { PageQueryRequest } from '../../../lib/teacher-page-status';
import type { TeachersPageState } from '../../../teachers-page.svelte';
import { teacherAssignmentsForTeachers } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { getContext, setContext } from 'svelte';
import { resolveTeacherPageLoad } from '../../../lib/teacher-page-status';
import { teacherDetailIdFromUrl } from '../../../lib/teacher-selectors';

type TeacherAssignment = components['schemas']['TeacherAssignment'];

const TEACHER_ASSIGNMENTS_TAB_KEY = Symbol('teacher-assignments-tab');

export interface TeacherAssignmentsTabSlice {
	teacherId: string;
	assignments: TeacherAssignment[];
}

export class TeacherAssignmentsTabState {
	slice = $state<TeacherAssignmentsTabSlice | null>(null);

	constructor(private readonly getPage: () => TeachersPageState) {}

	clear() {
		this.slice = null;
	}

	assignmentsFor(teacherId: string): TeacherAssignment[] {
		return this.slice?.teacherId === teacherId ? this.slice.assignments : [];
	}

	removeAssignment(id: string) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			assignments: this.slice.assignments.filter(row => row.id !== id),
		};
	}

	upsertAssignment(row: TeacherAssignment) {
		if (!this.slice || this.slice.teacherId !== row.teacherId) {
			return;
		}
		const index = this.slice.assignments.findIndex(entry => entry.id === row.id);
		if (index >= 0) {
			const next = [...this.slice.assignments];
			next[index] = row;
			this.slice = { ...this.slice, assignments: next };
			return;
		}
		this.slice = {
			...this.slice,
			assignments: [...this.slice.assignments, row],
		};
	}

	query() {
		return (url: URL, request?: PageQueryRequest) => resolveTeacherPageLoad(url, {
			empty: () => ({}),
			load: async (signal) => {
				const teacherId = teacherDetailIdFromUrl(url);
				if (!teacherId) {
					return {};
				}

				const page = this.getPage();
				await page.loadSubjectsIfNeeded();
				const scope = page.teacherScope();
				const assignments = await getBrowserSchoolClient().entities.teacherAssignments.list({
					...teacherAssignmentsForTeachers([teacherId]),
					academicYearId: scope.academicYearId,
					status: 'active',
				});

				signal.throwIfAborted();
				this.slice = {
					teacherId,
					assignments: assignments ?? [],
				};
				page.setAssignmentCount(teacherId, (assignments ?? []).length);
				return {};
			},
			hasItems: () => true,
			errorMessage: 'Unable to load teacher assignments.',
		}, request);
	}
}

export function setTeacherAssignmentsTabState(state: TeacherAssignmentsTabState) {
	setContext(TEACHER_ASSIGNMENTS_TAB_KEY, state);
}

export function getTeacherAssignmentsTabState() {
	return getContext<TeacherAssignmentsTabState>(TEACHER_ASSIGNMENTS_TAB_KEY);
}
