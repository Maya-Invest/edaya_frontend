import type { components } from '$lib/api/schema';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { TeacherListFilters } from '$lib/list/list-url-filters';
import type { Subject, Teacher } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { DEFAULT_LIST_PAGE_SIZE, uniqueIds } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchSchoolSubjectsSources, loadClassSubjectsByIds, mapAllClassSubjects } from '$lib/api/subjects-data';
import { fetchTeacherById, fetchTeachersPage } from '$lib/api/teachers-data';
import { authSession } from '$lib/auth/session.svelte';
import { mergeById } from '$lib/detail-data/seed-policies';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readTeacherListFilters, writeTeacherListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { ApiError } from '@maya-invest/edaya-api-client';
import { getContext, setContext } from 'svelte';
import {
	createTeacherOnPage,
	deleteTeacherUnavailabilityOnPage,
	deleteTeacherAssignmentOnPage,
	deleteTeacherOnPage,
	saveTeacherAssignmentOnPage,
	saveTeacherUnavailabilityOnPage,
	updateTeacherProfileOnPage,
	updateTeacherProfilePhotoOnPage,
	updateTeacherStatusOnPage,
} from './lib/teacher-detail-mutations';
import {
	filterTeacherList,
	teacherListUsesFullRoster,
} from './lib/teacher-list-filters';
import { ensureTeacherDrawerSelection, querySchoolTeachersPage } from './lib/teacher-queries';
import { teacherDetailIdFromUrl } from './lib/teacher-selectors';

export const SCHOOL_TEACHERS_PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export type TeacherUnavailability = components['schemas']['TeacherUnavailability'];

const TEACHERS_VERSION_FAMILIES = ['teachers', 'teacherUnavailabilities'] as const satisfies readonly EntityVersionKey[];

const TEACHERS_PAGE_STATE_KEY = Symbol('teachers-page-state');

export class TeachersPageState {
	teachers = $state<Teacher[]>([]);
	fullRosterTeachers = $state<Teacher[]>([]);
	assignmentCounts = $state<Record<string, number>>({});
	teacherUnavailabilities = $state<TeacherUnavailability[]>([]);
	subjects = $state<Subject[]>([]);
	totalTeachers = $state(0);
	listLoading = $state(false);
	listLoadingMore = $state(false);
	loadingFullRoster = $state(false);
	selectedResolving = $state(false);

	private listRequestVersion = 0;
	private subjectsLoaded = false;

	private readonly versions = new RouteVersionSnapshot(TEACHERS_VERSION_FAMILIES);

	readonly filters: ListFiltersState<TeacherListFilters>;

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeTeacherListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readTeacherListFilters(getUrl()),
		);
	}

	get selectedId() {
		return teacherDetailIdFromUrl(this.getUrl());
	}

	get selected() {
		const id = this.selectedId;
		if (!id) {
			return undefined;
		}
		return this.findTeacher(id);
	}

	get usesFullRoster() {
		return teacherListUsesFullRoster(this.filters.values);
	}

	findTeacher(id: string): Teacher | undefined {
		return this.teachers.find(teacher => teacher.id === id)
			?? this.fullRosterTeachers.find(teacher => teacher.id === id);
	}

	filterVisible(teachers: readonly Teacher[]): Teacher[] {
		return filterTeacherList(teachers, this.filters.values, {
			assignmentCount: teacherId => this.assignmentCount(teacherId) ?? -1,
		});
	}

	get visibleTeachers() {
		return this.filterVisible(this.listSourceTeachers());
	}

	private listSourceTeachers(): readonly Teacher[] {
		if (!this.usesFullRoster) {
			return this.teachers;
		}
		if (this.fullRosterTeachers.length > 0) {
			return this.fullRosterTeachers;
		}
		return this.teachers;
	}

	assignmentCount(teacherId: string): number | null {
		return this.assignmentCounts[teacherId] ?? null;
	}

	setAssignmentCount(teacherId: string, count: number) {
		this.assignmentCounts = { ...this.assignmentCounts, [teacherId]: count };
	}

	clearAssignmentCount(teacherId: string) {
		const { [teacherId]: _removed, ...rest } = this.assignmentCounts;
		this.assignmentCounts = rest;
	}

	adjustAssignmentCount(teacherId: string, delta: number) {
		const current = this.assignmentCounts[teacherId];
		if (current === undefined) {
			return;
		}
		this.setAssignmentCount(teacherId, Math.max(0, current + delta));
	}

	teacherUnavailabilitiesForTeacher(teacherId: string): TeacherUnavailability[] {
		return this.teacherUnavailabilities.filter(row => row.teacherId === teacherId);
	}

	seedTeacherUnavailabilities(teacherId: string, rows: TeacherUnavailability[]) {
		this.teacherUnavailabilities = [
			...this.teacherUnavailabilities.filter(row => row.teacherId !== teacherId),
			...rows,
		];
		this.versions.markLoaded();
	}

	upsertTeacherUnavailability(row: TeacherUnavailability) {
		this.teacherUnavailabilities = mergeById(this.teacherUnavailabilities, [row]);
	}

	removeTeacherUnavailability(id: string) {
		this.teacherUnavailabilities = this.teacherUnavailabilities.filter(row => row.id !== id);
	}

	async loadTeacherUnavailabilities(teacherId: string) {
		const academicYearId = this.teacherScope().academicYearId;
		if (!academicYearId) {
			this.seedTeacherUnavailabilities(teacherId, []);
			return;
		}
		const rows = await getBrowserSchoolClient().entities.teacherUnavailabilities.list({
			teacherId,
			academicYearId,
			$orderBy: [{ field: 'effectiveFrom', direction: 'asc' }],
		});
		this.seedTeacherUnavailabilities(teacherId, rows);
	}

	subjectLabel(classSubjectId: string | null | undefined): string {
		if (!classSubjectId) {
			return '';
		}
		return this.subjects.find(subject => subject.id === classSubjectId)?.name ?? classSubjectId;
	}

	mergeSubjects(incoming: readonly Subject[]) {
		this.subjects = mergeById(this.subjects, incoming);
	}

	async ensureClassSubjectsCached(classSubjectIds: readonly string[]) {
		await this.loadSubjectsIfNeeded();
		const missing = uniqueIds(
			classSubjectIds.filter(id => id && !this.subjects.some(subject => subject.id === id)),
		);
		if (missing.length === 0) {
			return;
		}

		const mapped = await loadClassSubjectsByIds(getBrowserSchoolClient(), missing);
		if (mapped.length > 0) {
			this.mergeSubjects(mapped);
			return;
		}

		this.subjectsLoaded = false;
		await this.loadSubjectsIfNeeded();
	}

	seedPage(
		teachers: Teacher[],
		totalTeachers: number,
	) {
		this.teachers = teachers;
		this.totalTeachers = totalTeachers;
		this.versions.markLoaded();
	}

	mergeTeachers(incoming: readonly Teacher[]) {
		const byId = Object.fromEntries(this.teachers.map(teacher => [teacher.id, teacher])) as Record<string, Teacher>;
		for (const teacher of incoming) {
			byId[teacher.id] = teacher;
		}
		this.teachers = Object.values(byId);
	}

	patchTeacher(id: string, patch: Partial<Teacher>) {
		const apply = (list: Teacher[]) => {
			const index = list.findIndex(teacher => teacher.id === id);
			if (index >= 0) {
				list[index] = { ...list[index], ...patch };
			}
		};
		apply(this.teachers);
		apply(this.fullRosterTeachers);
	}

	appendTeacher(teacher: Teacher) {
		this.mergeTeachers([teacher]);
		this.totalTeachers += 1;
	}

	removeTeacher(id: string) {
		this.teachers = this.teachers.filter(teacher => teacher.id !== id);
		this.fullRosterTeachers = this.fullRosterTeachers.filter(teacher => teacher.id !== id);
		this.clearAssignmentCount(id);
		this.totalTeachers = Math.max(0, this.totalTeachers - 1);
	}

	teacherScope() {
		const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
		const academicYearId = academicContext.yearId
			|| academicContext.year?.id
			|| academicContext.years[0]?.id
			|| '';
		return { schoolId, academicYearId };
	}

	async ensureSelectedTeacher(id: string): Promise<boolean> {
		if (this.findTeacher(id)) {
			return true;
		}
		const teacher = await fetchTeacherById(getBrowserSchoolClient(), id);
		if (!teacher) {
			return false;
		}
		this.mergeTeachers([teacher]);
		return true;
	}

	async loadSubjectsIfNeeded() {
		if (this.subjectsLoaded) {
			return;
		}
		const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? null;
		if (!schoolId) {
			this.subjects = [];
			this.subjectsLoaded = true;
			return;
		}
		const client = getBrowserSchoolClient();
		try {
			const sources = await fetchSchoolSubjectsSources(client, schoolId);
			this.subjects = mapAllClassSubjects(sources);
			this.subjectsLoaded = true;
		}
		catch (error) {
			if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
				this.subjects = [];
				this.subjectsLoaded = true;
				return;
			}
			throw error;
		}
	}

	async refreshList() {
		if (this.usesFullRoster) {
			return;
		}
		await this.loadFirstPage();
	}

	clearFullRoster() {
		this.fullRosterTeachers = [];
		this.loadingFullRoster = false;
	}

	async loadFirstPage() {
		const version = ++this.listRequestVersion;
		this.listLoading = true;
		this.fullRosterTeachers = [];
		try {
			await this.loadSubjectsIfNeeded();
			const result = await fetchTeachersPage(
				getBrowserSchoolClient(),
				this.teacherScope(),
				{ offset: 0, limit: SCHOOL_TEACHERS_PAGE_SIZE },
			);
			if (version !== this.listRequestVersion) {
				return;
			}
			this.seedPage(result.teachers, result.totalTeachers);
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
		if (this.teachers.length >= this.totalTeachers) {
			return;
		}

		const version = this.listRequestVersion;
		this.listLoadingMore = true;
		try {
			const result = await fetchTeachersPage(
				getBrowserSchoolClient(),
				this.teacherScope(),
				{ offset: this.teachers.length, limit: SCHOOL_TEACHERS_PAGE_SIZE },
			);
			if (version !== this.listRequestVersion) {
				return;
			}
			this.mergeTeachers(result.teachers);
			this.totalTeachers = result.totalTeachers;
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
			await this.loadSubjectsIfNeeded();
			let offset = 0;
			let total = 0;
			let teachers: Teacher[] = [];

			while (true) {
				const result = await fetchTeachersPage(
					getBrowserSchoolClient(),
					this.teacherScope(),
					{ offset, limit: SCHOOL_TEACHERS_PAGE_SIZE },
				);
				if (version !== this.listRequestVersion) {
					return;
				}
				total = result.totalTeachers;
				teachers = mergeById(teachers, result.teachers);
				if (teachers.length >= total) {
					break;
				}
				offset += SCHOOL_TEACHERS_PAGE_SIZE;
			}

			this.fullRosterTeachers = teachers;
			this.seedPage(teachers, total);
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
		this.filters.hydrate(readTeacherListFilters(this.getUrl()));
	}

	queryListPage() {
		return querySchoolTeachersPage(this);
	}

	ensureDrawerSelection(teacherId: string) {
		return ensureTeacherDrawerSelection(this, teacherId);
	}

	createTeacher(...args: Parameters<typeof createTeacherOnPage> extends [TeachersPageState, ...infer R] ? R : never) {
		return createTeacherOnPage(this, ...args);
	}

	updateProfile(...args: Parameters<typeof updateTeacherProfileOnPage> extends [TeachersPageState, ...infer R] ? R : never) {
		return updateTeacherProfileOnPage(this, ...args);
	}

	updateProfilePhoto(...args: Parameters<typeof updateTeacherProfilePhotoOnPage> extends [TeachersPageState, ...infer R] ? R : never) {
		return updateTeacherProfilePhotoOnPage(this, ...args);
	}

	updateStatus(...args: Parameters<typeof updateTeacherStatusOnPage> extends [TeachersPageState, ...infer R] ? R : never) {
		return updateTeacherStatusOnPage(this, ...args);
	}

	deleteTeacher(...args: Parameters<typeof deleteTeacherOnPage> extends [TeachersPageState, ...infer R] ? R : never) {
		return deleteTeacherOnPage(this, ...args);
	}

	saveAssignment(...args: Parameters<typeof saveTeacherAssignmentOnPage> extends [TeachersPageState, ...infer R] ? R : never) {
		return saveTeacherAssignmentOnPage(this, ...args);
	}

	deleteAssignment(...args: Parameters<typeof deleteTeacherAssignmentOnPage> extends [TeachersPageState, ...infer R] ? R : never) {
		return deleteTeacherAssignmentOnPage(this, ...args);
	}

	saveUnavailability(...args: Parameters<typeof saveTeacherUnavailabilityOnPage> extends [TeachersPageState, ...infer R] ? R : never) {
		return saveTeacherUnavailabilityOnPage(this, ...args);
	}

	deleteUnavailability(...args: Parameters<typeof deleteTeacherUnavailabilityOnPage> extends [TeachersPageState, ...infer R] ? R : never) {
		return deleteTeacherUnavailabilityOnPage(this, ...args);
	}
}

export function setTeachersPageState(state: TeachersPageState) {
	setContext(TEACHERS_PAGE_STATE_KEY, state);
}

export function getTeachersPageState() {
	return getContext<TeachersPageState>(TEACHERS_PAGE_STATE_KEY);
}
