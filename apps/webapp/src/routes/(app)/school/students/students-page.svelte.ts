import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { StudentListFilters } from '$lib/list/list-url-filters';
import type { Student } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { fetchStudentById, loadClassPeopleData, loadPeopleData, loadPeopleDataPage } from '$lib/api/people-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readStudentListFilters, writeStudentListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import {
	filterStudentList,
	studentListUsesFullRoster,
} from './lib/student-list-filters';
import { createStudentOnPage } from './lib/students-list-mutations';
import { ensureStudentDrawerSelection, querySchoolStudentsPage } from './lib/students-queries';

export const SCHOOL_STUDENTS_PAGE_SIZE = 25;

const STUDENTS_VERSION_FAMILIES = ['students'] as const satisfies readonly EntityVersionKey[];

const STUDENTS_PAGE_STATE_KEY = Symbol('students-page-state');

export class StudentsPageState {
	students = $state<Student[]>([]);
	totalStudents = $state(0);
	listLoading = $state(false);
	listLoadingMore = $state(false);
	fullRosterStudents = $state<Student[]>([]);
	loadingFullRoster = $state(false);
	selectedResolving = $state(false);

	private listRequestVersion = 0;

	private readonly versions = new RouteVersionSnapshot(STUDENTS_VERSION_FAMILIES);

	readonly filters: ListFiltersState<StudentListFilters>;

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeStudentListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readStudentListFilters(getUrl()),
		);
	}

	get classes() {
		return academicContext.classes;
	}

	get hierarchy() {
		return academicContext.hierarchy;
	}

	get selectedId() {
		return schoolStudentDetailIdFromUrl(this.getUrl());
	}

	get selected() {
		const id = this.selectedId;
		if (!id) {
			return undefined;
		}
		return this.findStudent(id);
	}

	findStudent(id: string): Student | undefined {
		return this.students.find(student => student.id === id)
			?? this.fullRosterStudents.find(student => student.id === id);
	}

	async ensureSelectedStudent(id: string): Promise<boolean> {
		if (this.findStudent(id)) {
			return true;
		}
		const student = await fetchStudentById(getBrowserSchoolClient(), id);
		if (!student) {
			return false;
		}
		this.mergeStudents([student]);
		return true;
	}

	get usesFullRoster() {
		return studentListUsesFullRoster(this.filters.values);
	}

	filterVisible(students: readonly Student[]): Student[] {
		const classNameById = new SvelteMap(this.classes.map(classGroup => [classGroup.id, classGroup.name]));
		return filterStudentList(students, this.filters.values, { classNameById });
	}

	get visibleStudents() {
		return this.filterVisible(this.listSourceStudents());
	}

	private listSourceStudents(): readonly Student[] {
		if (!this.usesFullRoster) {
			return this.students;
		}
		if (this.fullRosterStudents.length > 0) {
			return this.fullRosterStudents;
		}
		return this.students;
	}

	seedPage(students: Student[], totalStudents: number) {
		this.students = students;
		this.totalStudents = totalStudents;
		this.versions.markLoaded();
	}

	mergeStudents(incoming: readonly Student[]) {
		const byId = Object.fromEntries(this.students.map(student => [student.id, student])) as Record<string, Student>;
		for (const student of incoming) {
			byId[student.id] = student;
		}
		this.students = Object.values(byId);
	}

	patchStudent(id: string, patch: Partial<Student>) {
		const apply = (list: Student[]) => {
			const index = list.findIndex(student => student.id === id);
			if (index >= 0) {
				list[index] = { ...list[index], ...patch };
			}
		};
		apply(this.students);
		apply(this.fullRosterStudents);
	}

	appendStudent(student: Student) {
		this.mergeStudents([student]);
		this.totalStudents += 1;
	}

	async refreshList() {
		if (this.usesFullRoster) {
			return;
		}
		await this.loadFirstPage();
	}

	clearFullRoster() {
		this.fullRosterStudents = [];
		this.loadingFullRoster = false;
	}

	async loadFirstPage() {
		const version = ++this.listRequestVersion;
		this.listLoading = true;
		this.fullRosterStudents = [];
		try {
			const classGroupId = this.filters.values.class;
			const result = await loadPeopleDataPage(getBrowserSchoolClient(), {
				offset: 0,
				limit: SCHOOL_STUDENTS_PAGE_SIZE,
				...(classGroupId !== 'all' ? { classGroupId } : {}),
			});
			if (version !== this.listRequestVersion) {
				return;
			}
			this.seedPage(result.students, result.totalStudents);
		}
		finally {
			if (version === this.listRequestVersion) {
				this.listLoading = false;
			}
		}
	}

	async loadMore() {
		if (this.listLoading || this.listLoadingMore || this.usesFullRoster) {
			return;
		}
		if (this.students.length >= this.totalStudents) {
			return;
		}

		const version = this.listRequestVersion;
		this.listLoadingMore = true;
		try {
			const classGroupId = this.filters.values.class;
			const result = await loadPeopleDataPage(getBrowserSchoolClient(), {
				offset: this.students.length,
				limit: SCHOOL_STUDENTS_PAGE_SIZE,
				...(classGroupId !== 'all' ? { classGroupId } : {}),
			});
			if (version !== this.listRequestVersion) {
				return;
			}
			this.mergeStudents(result.students);
			this.totalStudents = result.totalStudents;
			this.versions.markLoaded();
		}
		finally {
			if (version === this.listRequestVersion) {
				this.listLoadingMore = false;
			}
		}
	}

	async loadFullRoster() {
		const version = ++this.listRequestVersion;
		this.listLoading = true;
		this.loadingFullRoster = true;
		try {
			const classGroupId = this.filters.values.class;
			const result = classGroupId === 'all'
				? await loadPeopleData(getBrowserSchoolClient())
				: await loadClassPeopleData(
						getBrowserSchoolClient(),
						classGroupId,
						academicContext.periodId,
					);
			if (version !== this.listRequestVersion) {
				return;
			}
			this.fullRosterStudents = result.students;
			this.seedPage(result.students, result.students.length);
		}
		finally {
			if (version === this.listRequestVersion) {
				this.listLoading = false;
				this.loadingFullRoster = false;
			}
		}
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshList();
	}

	hydrateFiltersFromUrl() {
		this.filters.hydrate(readStudentListFilters(this.getUrl()));
	}

	async createStudent(...args: Parameters<typeof createStudentOnPage> extends [StudentsPageState, ...infer R] ? R : never) {
		return createStudentOnPage(this, ...args);
	}

	queryListPage() {
		return querySchoolStudentsPage(this);
	}

	ensureDrawerSelection(studentId: string) {
		return ensureStudentDrawerSelection(this, studentId);
	}
}

export function setStudentsPageState(state: StudentsPageState) {
	setContext(STUDENTS_PAGE_STATE_KEY, state);
}

export function getStudentsPageState() {
	return getContext<StudentsPageState>(STUDENTS_PAGE_STATE_KEY);
}

export function schoolStudentDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/school\/students\/([^/]+)/);
	return match?.[1];
}
