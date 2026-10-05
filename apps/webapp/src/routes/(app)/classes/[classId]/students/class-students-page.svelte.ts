import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { ClassNode, Student } from '$lib/types/school';
import type { StudentPhotoSubmission } from '../../../school/students/lib/student-detail-host';
import type { ClassStudentsPageSlice } from './lib/class-students-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { requestDocumentIssuanceMutation, requestDocumentIssuanceBatchMutation } from '$lib/api/mutations/documents.mutations';
import { fetchStudentById } from '$lib/api/people-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readClassStudentListFilters, writeClassStudentListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import {
	loadPendingStudentPhotoReviews,
	pendingStudentPhotoFor,
} from '../../../school/students/lib/student-detail-host';
import {
	classStudentDetailIdFromUrl,
	classStudentsClassIdFromUrl,
	emptyClassStudentsSlice,
	filterClassStudents,
} from './lib/class-students-helpers';
import { createClassStudentOnPage } from './lib/class-students-list-mutations';
import {
	ensureClassStudentDrawerSelection,
	loadClassStudentsSlice,
	queryClassStudentsListPage,
} from './lib/class-students-queries';

const CLASS_STUDENTS_VERSION_FAMILIES = ['students', 'guardians', 'enrollments'] as const satisfies readonly EntityVersionKey[];

const CLASS_STUDENTS_PAGE_STATE_KEY = Symbol('class-students-page-state');

export type { ClassStudentsPageSlice };

export class ClassStudentsPageState {
	performRequestDocumentIssuance = (...args: Parameters<typeof requestDocumentIssuanceMutation>) => requestDocumentIssuanceMutation(...args);

	performRequestDocumentIssuanceBatch = (...args: Parameters<typeof requestDocumentIssuanceBatchMutation>) => requestDocumentIssuanceBatchMutation(...args);

	students = $state<Student[]>([]);
	currentClass = $state<ClassNode | undefined>(undefined);
	classId = $state<string | null>(null);
	selectedResolving = $state(false);
	pendingPhotoSubmissions = $state<StudentPhotoSubmission[]>([]);

	private readonly versions = new RouteVersionSnapshot(CLASS_STUDENTS_VERSION_FAMILIES);

	readonly filters: ListFiltersState<{ q: string; status: string }>;

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeClassStudentListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readClassStudentListFilters(getUrl()),
		);
	}

	get hierarchy() {
		return academicContext.hierarchy;
	}

	get selectedId() {
		return classStudentDetailIdFromUrl(this.getUrl());
	}

	get selected() {
		const id = this.selectedId;
		if (!id) {
			return undefined;
		}
		return this.findStudent(id);
	}

	findStudent(id: string): Student | undefined {
		return this.students.find(student => student.id === id);
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

	get visibleStudents() {
		return filterClassStudents(this.students, this.filters.values);
	}

	applySlice(classId: string, data: Partial<Omit<ClassStudentsPageSlice, 'classId'>>) {
		this.classId = classId;
		this.students = data.students ?? [];
		this.currentClass = data.currentClass;
		this.versions.markLoaded();
	}

	seed(classId: string, data: Partial<Omit<ClassStudentsPageSlice, 'classId'>>) {
		this.applySlice(classId, data);
	}

	mergeStudents(incoming: readonly Student[]) {
		const byId = Object.fromEntries(this.students.map(student => [student.id, student])) as Record<string, Student>;
		for (const student of incoming) {
			byId[student.id] = student;
		}
		this.students = Object.values(byId);
	}

	patchStudent(id: string, patch: Partial<Student>) {
		const index = this.students.findIndex(student => student.id === id);
		if (index >= 0) {
			this.students[index] = { ...this.students[index], ...patch };
		}
	}

	pendingPhotoFor(studentId: string): StudentPhotoSubmission | undefined {
		return pendingStudentPhotoFor(this.pendingPhotoSubmissions, studentId);
	}

	async loadPendingPhotoReviews() {
		this.pendingPhotoSubmissions = await loadPendingStudentPhotoReviews();
	}

	async refreshList(classId: string) {
		const data = await loadClassStudentsSlice(classId);
		this.applySlice(classId, data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		const classId = this.classId ?? classStudentsClassIdFromUrl(this.getUrl());
		if (!classId) {
			return;
		}
		await this.refreshList(classId);
	}

	hydrateFiltersFromUrl() {
		this.filters.hydrate(readClassStudentListFilters(this.getUrl()));
	}

	async createStudent(...args: Parameters<typeof createClassStudentOnPage> extends [ClassStudentsPageState, ...infer R] ? R : never) {
		return createClassStudentOnPage(this, ...args);
	}

	queryListPage(classId: string) {
		return queryClassStudentsListPage(classId, this);
	}

	ensureDrawerSelection(studentId: string) {
		return ensureClassStudentDrawerSelection(this, studentId);
	}
}

export function setClassStudentsPageState(state: ClassStudentsPageState) {
	setContext(CLASS_STUDENTS_PAGE_STATE_KEY, state);
}

export function getClassStudentsPageState() {
	return getContext<ClassStudentsPageState>(CLASS_STUDENTS_PAGE_STATE_KEY);
}

export function emptyClassStudentsPageSlice(classId: string) {
	return emptyClassStudentsSlice(classId);
}
