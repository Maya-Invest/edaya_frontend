import type { GuardianListFilters } from '$lib/list/list-url-filters';
import type { Guardian, Student } from '$lib/types/school';
import { DEFAULT_LIST_PAGE_SIZE } from '$lib/api/entity-list-filters';
import { fetchGuardianById, loadGuardiansPeopleDataPage } from '$lib/api/people-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { entityVersions } from '$lib/entity-versions.svelte';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readGuardianListFilters, writeGuardianListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { getContext, setContext } from 'svelte';
import {
	createGuardianOnPage,
	deleteGuardianOnPage,
	updateGuardianContactOnPage,
	updateGuardianProfilePhotoOnPage,
} from './lib/guardian-detail-mutations';
import {
	filterGuardianList,
	guardianDetailIdFromUrl,
	linkedStudentsForGuardian,
} from './lib/guardian-selectors';
import { ensureGuardianDrawerSelection, querySchoolGuardiansPage } from './lib/guardians-queries';

export const SCHOOL_GUARDIANS_PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

const GUARDIANS_PAGE_STATE_KEY = Symbol('guardians-page-state');

export class GuardiansPageState {
	guardians = $state<Guardian[]>([]);
	students = $state<Student[]>([]);
	totalGuardians = $state(0);
	listLoading = $state(false);
	listLoadingMore = $state(false);
	selectedResolving = $state(false);

	private loadedVersion = 0;
	private listRequestVersion = 0;

	readonly filters: ListFiltersState<GuardianListFilters>;

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeGuardianListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readGuardianListFilters(getUrl()),
		);
	}

	get selectedId() {
		return guardianDetailIdFromUrl(this.getUrl());
	}

	get selected() {
		const id = this.selectedId;
		if (!id) {
			return undefined;
		}
		return this.findGuardian(id);
	}

	findGuardian(id: string): Guardian | undefined {
		return this.guardians.find(guardian => guardian.id === id);
	}

	findStudent(id: string): Student | undefined {
		return this.students.find(student => student.id === id);
	}

	linkedStudents(guardian: Guardian): Student[] {
		return linkedStudentsForGuardian(this.students, guardian);
	}

	get visibleGuardians() {
		return filterGuardianList(this.guardians, this.filters.values);
	}

	seedPage(guardians: Guardian[], students: Student[], totalGuardians: number) {
		this.guardians = guardians;
		this.students = students;
		this.totalGuardians = totalGuardians;
		this.loadedVersion = entityVersions.guardians;
	}

	mergeGuardians(incoming: readonly Guardian[]) {
		const byId = Object.fromEntries(this.guardians.map(guardian => [guardian.id, guardian])) as Record<string, Guardian>;
		for (const guardian of incoming) {
			byId[guardian.id] = guardian;
		}
		this.guardians = Object.values(byId);
	}

	mergeStudents(incoming: readonly Student[]) {
		const byId = Object.fromEntries(this.students.map(student => [student.id, student])) as Record<string, Student>;
		for (const student of incoming) {
			byId[student.id] = student;
		}
		this.students = Object.values(byId);
	}

	patchGuardian(id: string, patch: Partial<Guardian>) {
		const index = this.guardians.findIndex(guardian => guardian.id === id);
		if (index >= 0) {
			this.guardians[index] = { ...this.guardians[index], ...patch };
		}
	}

	appendGuardian(guardian: Guardian) {
		this.mergeGuardians([guardian]);
		this.totalGuardians += 1;
	}

	removeGuardian(id: string) {
		this.guardians = this.guardians.filter(guardian => guardian.id !== id);
		this.totalGuardians = Math.max(0, this.totalGuardians - 1);
	}

	async ensureSelectedGuardian(id: string): Promise<boolean> {
		if (this.findGuardian(id)) {
			return true;
		}
		const guardian = await fetchGuardianById(getBrowserSchoolClient(), id);
		if (!guardian) {
			return false;
		}
		this.mergeGuardians([guardian]);
		return true;
	}

	async refreshList() {
		await this.loadFirstPage();
	}

	async loadFirstPage() {
		const version = ++this.listRequestVersion;
		this.listLoading = true;
		try {
			const result = await loadGuardiansPeopleDataPage(getBrowserSchoolClient(), {
				offset: 0,
				limit: SCHOOL_GUARDIANS_PAGE_SIZE,
			});
			if (version !== this.listRequestVersion) {
				return;
			}
			this.seedPage(result.guardians, result.students, result.totalGuardians);
		}
		finally {
			if (version === this.listRequestVersion) {
				this.listLoading = false;
			}
		}
	}

	async loadMore() {
		if (this.listLoading || this.listLoadingMore) {
			return;
		}
		if (this.guardians.length >= this.totalGuardians) {
			return;
		}

		const version = this.listRequestVersion;
		this.listLoadingMore = true;
		try {
			const result = await loadGuardiansPeopleDataPage(getBrowserSchoolClient(), {
				offset: this.guardians.length,
				limit: SCHOOL_GUARDIANS_PAGE_SIZE,
			});
			if (version !== this.listRequestVersion) {
				return;
			}
			this.mergeGuardians(result.guardians);
			this.mergeStudents(result.students);
			this.totalGuardians = result.totalGuardians;
			this.loadedVersion = entityVersions.guardians;
		}
		finally {
			if (version === this.listRequestVersion) {
				this.listLoadingMore = false;
			}
		}
	}

	async invalidateIfStale() {
		if (this.loadedVersion === entityVersions.guardians) {
			return;
		}
		await this.refreshList();
	}

	hydrateFiltersFromUrl() {
		this.filters.hydrate(readGuardianListFilters(this.getUrl()));
	}

	queryListPage() {
		return querySchoolGuardiansPage(this);
	}

	ensureDrawerSelection(guardianId: string) {
		return ensureGuardianDrawerSelection(this, guardianId);
	}

	createGuardian(...args: Parameters<typeof createGuardianOnPage> extends [GuardiansPageState, ...infer R] ? R : never) {
		return createGuardianOnPage(this, ...args);
	}

	updateContact(...args: Parameters<typeof updateGuardianContactOnPage> extends [GuardiansPageState, ...infer R] ? R : never) {
		return updateGuardianContactOnPage(this, ...args);
	}

	deleteGuardian(...args: Parameters<typeof deleteGuardianOnPage> extends [GuardiansPageState, ...infer R] ? R : never) {
		return deleteGuardianOnPage(this, ...args);
	}

	updateProfilePhoto(...args: Parameters<typeof updateGuardianProfilePhotoOnPage> extends [GuardiansPageState, ...infer R] ? R : never) {
		return updateGuardianProfilePhotoOnPage(this, ...args);
	}
}

export function setGuardiansPageState(state: GuardiansPageState) {
	setContext(GUARDIANS_PAGE_STATE_KEY, state);
}

export function getGuardiansPageState() {
	return getContext<GuardiansPageState>(GUARDIANS_PAGE_STATE_KEY);
}
