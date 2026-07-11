import type { components } from '$lib/api/schema';
import type {
	PermissionCatalogEntry,
	StaffPermissionAssignmentView,
} from '$lib/api/staff-permission-assignments-data';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { StaffListFilters } from '$lib/list/list-url-filters';
import type { StaffMember } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { DEFAULT_LIST_PAGE_SIZE } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchStaffMemberById, fetchStaffMembersPage } from '$lib/api/staff-data';
import {
	loadStaffPermissionPageData,
} from '$lib/api/staff-permission-assignments-data';
import { authSession } from '$lib/auth/session.svelte';
import { mergeById } from '$lib/detail-data/seed-policies';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readStaffListFilters, writeStaffListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import {
	createStaffOnPage,
	deleteStaffOnPage,
	deleteStaffPermissionOnPage,
	saveStaffPermissionOnPage,
	updateStaffProfileOnPage,
	updateStaffProfilePhotoOnPage,
	updateStaffStatusOnPage,
} from './lib/staff-detail-mutations';
import {
	filterStaffList,
	staffListUsesFullRoster,
} from './lib/staff-list-filters';
import { ensureStaffDrawerSelection, querySchoolStaffPage } from './lib/staff-queries';
import { staffDetailIdFromUrl } from './lib/staff-selectors';

export const SCHOOL_STAFF_PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

type StaffAssignment = components['schemas']['StaffAssignment'];
type ClassSubject = components['schemas']['ClassSubject'];

const STAFF_VERSION_FAMILIES = ['staff'] as const satisfies readonly EntityVersionKey[];

const STAFF_PAGE_STATE_KEY = Symbol('staff-page-state');

export class StaffPageState {
	staff = $state<StaffMember[]>([]);
	fullRosterStaff = $state<StaffMember[]>([]);
	staffAssignments = $state<StaffAssignment[]>([]);
	classSubjects = $state<ClassSubject[]>([]);
	staffPermissionAssignments = $state<StaffPermissionAssignmentView[]>([]);
	permissionCatalog = $state<PermissionCatalogEntry[]>([]);
	staffPermissionDataKey = $state<string | null>(null);
	totalStaff = $state(0);
	listLoading = $state(false);
	listLoadingMore = $state(false);
	loadingFullRoster = $state(false);
	selectedResolving = $state(false);

	private listRequestVersion = 0;

	private readonly versions = new RouteVersionSnapshot(STAFF_VERSION_FAMILIES);

	readonly filters: ListFiltersState<StaffListFilters>;

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeStaffListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readStaffListFilters(getUrl()),
		);
	}

	get classes() {
		return academicContext.classes;
	}

	get selectedId() {
		return staffDetailIdFromUrl(this.getUrl());
	}

	get selected() {
		const id = this.selectedId;
		if (!id) {
			return undefined;
		}
		return this.findStaff(id);
	}

	get usesFullRoster() {
		return staffListUsesFullRoster(this.filters.values);
	}

	findStaff(id: string): StaffMember | undefined {
		return this.staff.find(member => member.id === id)
			?? this.fullRosterStaff.find(member => member.id === id);
	}

	filterVisible(members: readonly StaffMember[]): StaffMember[] {
		const classNameById = new SvelteMap(this.classes.map(classGroup => [classGroup.id, classGroup.name]));
		return filterStaffList(members, this.filters.values, { classNameById });
	}

	get visibleStaff() {
		return this.filterVisible(this.listSourceStaff());
	}

	private listSourceStaff(): readonly StaffMember[] {
		if (!this.usesFullRoster) {
			return this.staff;
		}
		if (this.fullRosterStaff.length > 0) {
			return this.fullRosterStaff;
		}
		return this.staff;
	}

	staffAssignmentsForStaff(staffId: string): StaffAssignment[] {
		return this.staffAssignments.filter(row => row.staffId === staffId);
	}

	permissionAssignmentsForStaff(staffId: string): StaffPermissionAssignmentView[] {
		return this.staffPermissionAssignments.filter(row => row.staffId === staffId);
	}

	hasStaffPermissionData(key: string) {
		return this.staffPermissionDataKey === key;
	}

	seedPage(
		staff: StaffMember[],
		totalStaff: number,
		assignments: StaffAssignment[] = [],
		classSubjects: ClassSubject[] = [],
	) {
		this.staff = staff;
		this.totalStaff = totalStaff;
		this.mergeStaffAssignments(assignments);
		this.mergeClassSubjects(classSubjects);
		this.versions.markLoaded();
	}

	mergeStaff(incoming: readonly StaffMember[]) {
		const byId = Object.fromEntries(this.staff.map(member => [member.id, member])) as Record<string, StaffMember>;
		for (const member of incoming) {
			byId[member.id] = member;
		}
		this.staff = Object.values(byId);
	}

	mergeStaffAssignments(rows: readonly StaffAssignment[]) {
		this.staffAssignments = mergeById(this.staffAssignments, rows);
	}

	mergeClassSubjects(rows: readonly ClassSubject[]) {
		this.classSubjects = mergeById(this.classSubjects, rows);
	}

	seedStaffPermissionData(
		data: {
			assignments: StaffPermissionAssignmentView[];
			catalog: PermissionCatalogEntry[];
		},
		key: string,
	) {
		this.staffPermissionAssignments = data.assignments;
		this.permissionCatalog = data.catalog;
		this.staffPermissionDataKey = key;
	}

	upsertPermissionAssignment(row: StaffPermissionAssignmentView) {
		this.staffPermissionAssignments = mergeById(this.staffPermissionAssignments, [row]);
	}

	removePermissionAssignment(id: string) {
		this.staffPermissionAssignments = this.staffPermissionAssignments.filter(row => row.id !== id);
	}

	patchStaff(id: string, patch: Partial<StaffMember>) {
		const apply = (list: StaffMember[]) => {
			const index = list.findIndex(member => member.id === id);
			if (index >= 0) {
				list[index] = { ...list[index], ...patch };
			}
		};
		apply(this.staff);
		apply(this.fullRosterStaff);
	}

	appendStaff(member: StaffMember) {
		this.mergeStaff([member]);
		this.totalStaff += 1;
	}

	removeStaff(id: string) {
		this.staff = this.staff.filter(member => member.id !== id);
		this.fullRosterStaff = this.fullRosterStaff.filter(member => member.id !== id);
		this.totalStaff = Math.max(0, this.totalStaff - 1);
	}

	private staffScope() {
		const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
		const academicYearId = academicContext.yearId
			|| academicContext.year?.id
			|| academicContext.years[0]?.id
			|| '';
		return { schoolId, academicYearId };
	}

	async ensureSelectedStaff(id: string): Promise<boolean> {
		if (this.findStaff(id)) {
			return true;
		}
		const member = await fetchStaffMemberById(getBrowserSchoolClient(), id, this.staffScope().schoolId);
		if (!member) {
			return false;
		}
		this.mergeStaff([member]);
		return true;
	}

	async loadPermissionData() {
		const scope = this.staffScope();
		if (!scope.schoolId || !scope.academicYearId) {
			return;
		}
		const key = `${scope.schoolId}:${scope.academicYearId}`;
		if (this.hasStaffPermissionData(key)) {
			return;
		}
		const data = await loadStaffPermissionPageData(getBrowserSchoolClient(), scope, undefined);
		this.seedStaffPermissionData(data, key);
	}

	async refreshList() {
		if (this.usesFullRoster) {
			return;
		}
		await this.loadFirstPage();
	}

	clearFullRoster() {
		this.fullRosterStaff = [];
		this.loadingFullRoster = false;
	}

	async loadFirstPage() {
		const version = ++this.listRequestVersion;
		this.listLoading = true;
		this.fullRosterStaff = [];
		try {
			const result = await fetchStaffMembersPage(
				getBrowserSchoolClient(),
				this.staffScope(),
				{ offset: 0, limit: SCHOOL_STAFF_PAGE_SIZE },
			);
			if (version !== this.listRequestVersion) {
				return;
			}
			this.seedPage(result.staff, result.totalStaff, result.assignments, result.classSubjects);
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
		if (this.staff.length >= this.totalStaff) {
			return;
		}

		const version = this.listRequestVersion;
		this.listLoadingMore = true;
		try {
			const result = await fetchStaffMembersPage(
				getBrowserSchoolClient(),
				this.staffScope(),
				{ offset: this.staff.length, limit: SCHOOL_STAFF_PAGE_SIZE },
			);
			if (version !== this.listRequestVersion) {
				return;
			}
			this.mergeStaff(result.staff);
			this.mergeStaffAssignments(result.assignments);
			this.mergeClassSubjects(result.classSubjects);
			this.totalStaff = result.totalStaff;
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
			let offset = 0;
			let total = 0;
			let members: StaffMember[] = [];
			let assignments: StaffAssignment[] = [];
			let classSubjects: ClassSubject[] = [];

			while (true) {
				const result = await fetchStaffMembersPage(
					getBrowserSchoolClient(),
					this.staffScope(),
					{ offset, limit: SCHOOL_STAFF_PAGE_SIZE },
				);
				if (version !== this.listRequestVersion) {
					return;
				}
				total = result.totalStaff;
				members = mergeById(members, result.staff);
				assignments = mergeById(assignments, result.assignments);
				classSubjects = mergeById(classSubjects, result.classSubjects);
				if (members.length >= total) {
					break;
				}
				offset += SCHOOL_STAFF_PAGE_SIZE;
			}

			this.fullRosterStaff = members;
			this.seedPage(members, total, assignments, classSubjects);
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
		this.filters.hydrate(readStaffListFilters(this.getUrl()));
	}

	queryListPage() {
		return querySchoolStaffPage(this);
	}

	ensureDrawerSelection(staffId: string) {
		return ensureStaffDrawerSelection(this, staffId);
	}

	createStaff(...args: Parameters<typeof createStaffOnPage> extends [StaffPageState, ...infer R] ? R : never) {
		return createStaffOnPage(this, ...args);
	}

	updateProfile(...args: Parameters<typeof updateStaffProfileOnPage> extends [StaffPageState, ...infer R] ? R : never) {
		return updateStaffProfileOnPage(this, ...args);
	}

	updateStatus(...args: Parameters<typeof updateStaffStatusOnPage> extends [StaffPageState, ...infer R] ? R : never) {
		return updateStaffStatusOnPage(this, ...args);
	}

	deleteStaff(...args: Parameters<typeof deleteStaffOnPage> extends [StaffPageState, ...infer R] ? R : never) {
		return deleteStaffOnPage(this, ...args);
	}

	updateProfilePhoto(...args: Parameters<typeof updateStaffProfilePhotoOnPage> extends [StaffPageState, ...infer R] ? R : never) {
		return updateStaffProfilePhotoOnPage(this, ...args);
	}

	savePermission(...args: Parameters<typeof saveStaffPermissionOnPage> extends [StaffPageState, ...infer R] ? R : never) {
		return saveStaffPermissionOnPage(this, ...args);
	}

	deletePermission(...args: Parameters<typeof deleteStaffPermissionOnPage> extends [StaffPageState, ...infer R] ? R : never) {
		return deleteStaffPermissionOnPage(this, ...args);
	}
}

export function setStaffPageState(state: StaffPageState) {
	setContext(STAFF_PAGE_STATE_KEY, state);
}

export function getStaffPageState() {
	return getContext<StaffPageState>(STAFF_PAGE_STATE_KEY);
}
