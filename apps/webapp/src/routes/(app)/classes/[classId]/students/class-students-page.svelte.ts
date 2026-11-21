import type { DirectoryQuery } from '../../../school/students/lib/directory-page';
import { academicContext } from '$lib/academic/context.svelte';
import { requestDocumentIssuanceMutation, requestDocumentIssuanceBatchMutation } from '$lib/api/mutations/documents.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readClassStudentListFilters, writeClassStudentListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { getContext, setContext } from 'svelte';
import { StudentDirectoryState } from '../../../school/students/lib/student-directory-state.svelte';
import { classStudentDetailIdFromUrl, classStudentsClassIdFromUrl } from './lib/class-students-helpers';
import { createClassStudentOnPage } from './lib/class-students-list-mutations';
import { queryClassStudentsListPage } from './lib/class-students-queries';

const CLASS_STUDENTS_PAGE_STATE_KEY = Symbol('class-students-page-state');

export class ClassStudentsPageState extends StudentDirectoryState {
	private readonly exportController = new AbortController();
	performRequestDocumentIssuance = requestDocumentIssuanceMutation;
	performRequestDocumentIssuanceBatch = requestDocumentIssuanceBatchMutation;

	readonly filters: ListFiltersState<{ q: string; status: string }>;

	constructor(getUrl: () => URL) {
		super(getUrl, 30);
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeClassStudentListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readClassStudentListFilters(getUrl()),
		);
	}

	get currentClass() {
		return this.classes.find(entry => entry.id === classStudentsClassIdFromUrl(this.getUrl()));
	}

	get selectedId() {
		return classStudentDetailIdFromUrl(this.getUrl());
	}

	protected detailClassScope() {
		const classGroupId = classStudentsClassIdFromUrl(this.getUrl());
		return classGroupId ? { classGroupId, periodId: academicContext.periodId || '' } : undefined;
	}

	protected requestFor(url: URL, { q, status } = readClassStudentListFilters(url)): DirectoryQuery | null {
		const classGroupId = classStudentsClassIdFromUrl(url);
		const knownStatus = (['active', 'inactive', 'graduated', 'archived'] as const).find(value => value === status);
		if (!classGroupId || (status !== 'all' && !knownStatus))
return null;
		return { view: 'class-roster', classGroupId, q: q || undefined, status: knownStatus, sort: 'roster', periodId: academicContext.periodId || undefined };
	}

	async matchingMemberIds() {
		const url = this.getUrl();
		const query = this.requestFor(url, this.filters.values);
		const scope = this.scopeKey();
		const selectionKey = JSON.stringify(query);
		const signal = this.exportController.signal;
		const assertCurrent = () => {
			signal.throwIfAborted();
			const current = this.requestFor(this.getUrl(), this.filters.values);
			if (scope !== this.scopeKey() || selectionKey !== JSON.stringify(current))
				throw new DOMException('Roster changed', 'AbortError');
		};
		const result = query?.classGroupId
			? await getBrowserSchoolClient().queries.getClassRosterMemberIds({ classGroupId: query.classGroupId, status: query.status, q: query.q }, { signal })
			: { studentIds: [] };
		assertCurrent();
		return { key: JSON.stringify([scope, selectionKey]), studentIds: result.studentIds, assertCurrent };
	}

	override dispose() {
		this.exportController.abort();
		super.dispose();
	}

	hydrateFiltersFromUrl() {
		this.filters.hydrate(readClassStudentListFilters(this.getUrl()));
	}

	async createStudent(...args: Parameters<typeof createClassStudentOnPage> extends [ClassStudentsPageState, ...infer R] ? R : never) {
		return createClassStudentOnPage(this, ...args);
	}

	queryListPage() {
		return queryClassStudentsListPage(this);
	}

	ensureDrawerSelection(studentId: string) {
		return this.ensureSelectedStudent(studentId);
	}
}

export function setClassStudentsPageState(state: ClassStudentsPageState) {
	setContext(CLASS_STUDENTS_PAGE_STATE_KEY, state);
}

export function getClassStudentsPageState() {
	return getContext<ClassStudentsPageState>(CLASS_STUDENTS_PAGE_STATE_KEY);
}
