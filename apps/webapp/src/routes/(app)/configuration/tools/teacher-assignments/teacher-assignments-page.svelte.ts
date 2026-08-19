import type { components } from '$lib/api/schema';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { Subject, Teacher } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadClassSubjectsByIds } from '$lib/api/subjects-data';
import { fetchTeacherAssignmentsHubData } from '$lib/api/teacher-assignments-hub-data';
import { authSession } from '$lib/auth/session.svelte';
import { mergeById } from '$lib/detail-data/seed-policies';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import {
	readTeacherAssignmentsListFilters,
	writeTeacherAssignmentsListFilters,
} from './lib/teacher-assignments-list-filters';
import { deleteTeacherAssignmentOnHub, saveTeacherAssignmentOnHub } from './lib/teacher-assignments-mutations';
import { querySchoolTeacherAssignmentsPage } from './lib/teacher-assignments-queries';

type TeacherAssignment = components['schemas']['TeacherAssignment'];

const VERSION_FAMILIES = ['teachers'] as const satisfies readonly EntityVersionKey[];

const TEACHER_ASSIGNMENTS_PAGE_STATE_KEY = Symbol('teacher-assignments-page-state');

export class TeacherAssignmentsPageState {
	teachers = $state<Teacher[]>([]);
	assignments = $state<TeacherAssignment[]>([]);
	classSubjects = $state<Subject[]>([]);

	readonly filters: ListFiltersState<{ q: string; class: string; teacher: string }>;

	private readonly versions = new RouteVersionSnapshot(VERSION_FAMILIES);

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeTeacherAssignmentsListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readTeacherAssignmentsListFilters(getUrl()),
		);
	}

	hubScope() {
		return {
			schoolId: authSession.schoolId ?? academicContext.schools[0]?.id ?? '',
			academicYearId: academicContext.yearId
				|| academicContext.year?.id
				|| academicContext.years[0]?.id
				|| '',
		};
	}

	seed(teachers: Teacher[], assignments: TeacherAssignment[], classSubjects: Subject[]) {
		this.teachers = teachers;
		this.assignments = assignments;
		this.classSubjects = classSubjects;
		this.versions.markLoaded();
	}

	findTeacher(id: string): Teacher | undefined {
		return this.teachers.find(teacher => teacher.id === id);
	}

	subjectLabel(classSubjectId: string | null | undefined): string {
		if (!classSubjectId) {
			return '';
		}
		return this.classSubjects.find(subject => subject.id === classSubjectId)?.name ?? classSubjectId;
	}

	upsertAssignment(row: TeacherAssignment) {
		this.assignments = mergeById(this.assignments, [row]);
	}

	removeAssignment(id: string) {
		this.assignments = this.assignments.filter(row => row.id !== id);
	}

	async ensureClassSubjectsCached(classSubjectIds: readonly string[]) {
		const missing = classSubjectIds.filter(
			id => id && !this.classSubjects.some(subject => subject.id === id),
		);
		if (missing.length === 0) {
			return;
		}
		const mapped = await loadClassSubjectsByIds(getBrowserSchoolClient(), missing);
		if (mapped.length > 0) {
			this.classSubjects = mergeById(this.classSubjects, mapped);
		}
	}

	queryListPage() {
		return querySchoolTeacherAssignmentsPage(this);
	}

	async refreshSlice() {
		const scope = this.hubScope();
		if (!scope.schoolId) {
			this.seed([], [], []);
			return;
		}
		const data = await fetchTeacherAssignmentsHubData(getBrowserSchoolClient(), scope);
		this.seed(data.teachers, data.assignments, data.classSubjects);
	}

	async ensureTeachersLoaded() {
		if (this.teachers.length > 0) {
			return;
		}
		await this.refreshSlice();
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}

	saveAssignment(input: {
		assignment: TeacherAssignment;
		successMessage?: string;
	}) {
		return saveTeacherAssignmentOnHub(this, input);
	}

	deleteAssignment(input: {
		id: string;
		successMessage?: string;
	}) {
		return deleteTeacherAssignmentOnHub(this, input);
	}
}

export function setTeacherAssignmentsPageState(state: TeacherAssignmentsPageState) {
	setContext(TEACHER_ASSIGNMENTS_PAGE_STATE_KEY, state);
}

export function getTeacherAssignmentsPageState(): TeacherAssignmentsPageState {
	return getContext<TeacherAssignmentsPageState>(TEACHER_ASSIGNMENTS_PAGE_STATE_KEY);
}
