import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { Student } from '$lib/types/school';
import type { DirectoryQuery } from './directory-page';
import type { StudentPhotoSubmission } from './student-detail-host';
import { academicContext } from '$lib/academic/context.svelte';
import { ApiError } from '$lib/api/http';
import { fetchStudentById } from '$lib/api/people-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { mergeById } from '$lib/detail-data/seed-policies';
import { ListSelectionState } from '$lib/list/list-selection-state.svelte';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { readDirectoryPage } from './directory-page';
import { loadPendingStudentPhotoReviews, pendingStudentPhotoFor } from './student-detail-host';

const STUDENTS_VERSION_FAMILIES = ['students', 'enrollments', 'guardians', 'attendance', 'evaluations', 'school'] as const satisfies readonly EntityVersionKey[];

export abstract class StudentDirectoryState {
	readonly selection = new ListSelectionState<Student>();

	students = $state<Student[]>([]);
	totalStudents = $state(0);
	listLoading = $state(false);
	listLoadingMore = $state(false);
	private detailStudent = $state<Student>();
	private detailScope = '';
	private nextOffset = $state(0);
	private loadedKey = '';
	private controller = new AbortController();
	selectedResolving = $state(false);
	pendingPhotoSubmissions = $state<StudentPhotoSubmission[]>([]);

	private listRequestVersion = 0;

	private readonly versions = new RouteVersionSnapshot(STUDENTS_VERSION_FAMILIES);

	private detailReadVersion = 0;

	constructor(protected readonly getUrl: () => URL, private readonly pageSize: number) {}

	get classes() {
		return academicContext.classes;
	}

	get hierarchy() {
		return academicContext.hierarchy;
	}

	abstract get selectedId(): string | undefined;

	protected abstract requestFor(url: URL): DirectoryQuery | null;

	protected detailClassScope(): { classGroupId: string; periodId: string } | undefined {
		return undefined;
	}

	get selected() {
		const id = this.selectedId;
		return id && this.detailStudent?.id === id && this.detailScope === this.scopeKey() ? this.detailStudent : undefined;
	}

	scopeKey() {
		return JSON.stringify([authSession.authUserId, authSession.userId, authSession.schoolId, academicContext.yearId, academicContext.scopeGeneration, authSession.grants, this.detailClassScope()]);
	}

	directoryKey(url: URL) {
		return JSON.stringify(['student-directory', this.scopeKey(), this.requestFor(url)]);
	}

	findStudent(id: string): Student | undefined {
		if (this.detailStudent?.id === id && this.detailScope === this.scopeKey()) {
			return this.detailStudent;
		}
		return this.loadedKey === this.directoryKey(this.getUrl()) ? this.students.find(student => student.id === id) : undefined;
	}

	async ensureSelectedStudent(id: string, force = false): Promise<boolean> {
		const scope = this.scopeKey();
		const version = ++this.detailReadVersion;
		if (!force && this.detailScope === scope && this.detailStudent?.id === id)
			return true;
		const student = await fetchStudentById(getBrowserSchoolClient(), id, this.detailClassScope());
		if (version !== this.detailReadVersion || scope !== this.scopeKey())
			return false;
		this.detailScope = scope;
		this.detailStudent = student ?? undefined;
		return Boolean(student);
	}

	pendingPhotoFor(studentId: string): StudentPhotoSubmission | undefined {
		return pendingStudentPhotoFor(this.pendingPhotoSubmissions, studentId);
	}

	patchStudent(id: string, patch: Partial<Student>) {
		if (this.detailStudent?.id === id)
			this.detailStudent = { ...this.detailStudent, ...patch };
		this.students = this.students.map(student => student.id === id ? { ...student, ...patch } : student);
	}

	private photoReadVersion = 0;
	async loadPendingPhotoReviews() {
		const version = ++this.photoReadVersion;
		const scope = this.scopeKey();
		const studentId = this.selectedId;
		const rows = studentId ? await loadPendingStudentPhotoReviews(studentId) : [];
		if (version === this.photoReadVersion && scope === this.scopeKey() && studentId === this.selectedId) {
			this.pendingPhotoSubmissions = rows;
		}
	}

	dispose() {
		this.listRequestVersion++;
		this.photoReadVersion++;
		this.detailReadVersion++;
		this.controller.abort();
	}

	get hasMore() {
		return this.nextOffset < this.totalStudents;
	}

	private async readPage(offset: number, limit: number, signal: AbortSignal) {
		const key = this.directoryKey(this.getUrl());
		try {
			const query = this.requestFor(this.getUrl());
			return query ? await readDirectoryPage(getBrowserSchoolClient(), query, offset, limit, signal) : { students: [], total: 0 };
		}
		catch (error) {
			if (!signal.aborted && key === this.directoryKey(this.getUrl()) && error instanceof ApiError && (error.status === 401 || error.status === 403)) {
				this.students = [];
				this.totalStudents = 0;
				this.nextOffset = 0;
				this.loadedKey = '';
				this.detailReadVersion++;
				this.detailStudent = undefined;
				this.pendingPhotoSubmissions = [];
				this.selection.clearSelection();
			}
			throw error;
		}
	}

	async loadFirstPage(parentSignal?: AbortSignal) {
		const version = ++this.listRequestVersion;
		this.controller.abort();
		const controller = new AbortController();
		this.controller = controller;
		const abort = () => controller.abort();
		parentSignal?.addEventListener('abort', abort, { once: true });
		if (parentSignal?.aborted)
			controller.abort();
		const key = this.directoryKey(this.getUrl());
		this.students = [];
		this.totalStudents = 0;
		this.pendingPhotoSubmissions = [];
		this.loadedKey = '';
		this.listLoading = true;
		this.listLoadingMore = false;
		try {
			if (!authSession.schoolId)
				return;
			for (let attempt = 0; attempt < 2; attempt++) {
				const snapshot = this.versions.capture();
				const page = await this.readPage(0, this.pageSize, controller.signal);
				if (controller.signal.aborted || key !== this.directoryKey(this.getUrl()))
					return;
				this.students = page.students;
				this.nextOffset = page.students.length;
				this.totalStudents = page.total;
				this.loadedKey = key;
				this.versions.markLoaded(snapshot);
				if (!this.versions.isStale())
					break;
			}
		}
		finally {
			parentSignal?.removeEventListener('abort', abort);
			if (version === this.listRequestVersion)
				this.listLoading = false;
		}
	}

	async loadMore() {
		if (this.listLoading || this.listLoadingMore || !this.hasMore)
			return;
		const key = this.directoryKey(this.getUrl());
		if (key !== this.loadedKey)
			return;
		const signal = this.controller.signal;
		this.listLoadingMore = true;
		try {
			const page = await this.readPage(this.nextOffset, this.pageSize, signal);
			if (signal.aborted || key !== this.directoryKey(this.getUrl()))
				return;
			this.students = mergeById(this.students, page.students);
			this.nextOffset = page.students.length ? this.nextOffset + page.students.length : page.total;
			this.totalStudents = page.total;
		}
		finally {
			if (!signal.aborted)
				this.listLoadingMore = false;
		}
	}

	async matchingRows(): Promise<Student[]> {
		const signal = this.controller.signal;
		const key = this.directoryKey(this.getUrl());
		const rows: Student[] = [];
		let offset = 0;
		for (;;) {
			const page = await this.readPage(offset, 100, signal);
			signal.throwIfAborted();
			if (key !== this.directoryKey(this.getUrl()))
				throw new DOMException('Directory changed', 'AbortError');
			rows.push(...page.students);
			offset += page.students.length;
			if (offset >= page.total || !page.students.length)
				return rows;
		}
	}

	async refreshList() {
		return this.loadFirstPage();
	}

	async invalidateIfStale() {
		if (this.listLoading || !this.versions.hasLoaded() || !this.versions.isStale()) {
			return;
		}
		await this.refreshList();
	}
}
