import type { components } from '$lib/api/schema';
import type {
	PermissionCatalogEntry,
} from '$lib/api/staff-permission-assignments-data';
import type { ClassAttendanceMode, ClassNode, StaffMember } from '$lib/types/school';
import type { ClassesPageSlice } from './lib/classes-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { refreshAppShellData } from '$lib/api/mutations/run-mutation';
import { createStaffAssignmentPayload } from '$lib/api/mutations/staff-assignments.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { mergeById } from '$lib/detail-data/seed-policies';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readClassGroupListFilters, writeClassGroupListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { nextClassGroupIdFromExistingClasses } from '$lib/school/next-class-group-id';
import { getContext, setContext } from 'svelte';
import { classGroupIdFromUrl } from './lib/classes-helpers';
import {
	ensureClassGroupDrawerSelection,
	fetchClassGroupStaffAssignments,
	fetchPermissionCatalogEntries,
	fetchStaffDirectory,
	loadClassesSlice,
	queryClassesListPage,
} from './lib/classes-queries';
import { runClassesRouteMutation } from './lib/classes-route-mutation';

type StaffAssignment = components['schemas']['StaffAssignment'];

const CLASSES_VERSION_FAMILIES = [] as const;

const CLASSES_PAGE_STATE_KEY = Symbol('classes-page-state');

export type { ClassesPageSlice };

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
}

function nextClassId(gradeLevelId: string): string {
	return nextClassGroupIdFromExistingClasses(
		gradeLevelId,
		academicContext.classes.map(entry => entry.id),
		{ gradeLevelName: academicContext.gradeLevelById(gradeLevelId)?.name },
	);
}

export class ClassesPageState {
	slice = $state<ClassesPageSlice | null>(null);
	staff = $state<StaffMember[]>([]);
	staffAssignments = $state<StaffAssignment[]>([]);
	permissionCatalog = $state<PermissionCatalogEntry[]>([]);
	selectedResolving = $state(false);

	readonly filters: ListFiltersState<{ q: string }>;

	private readonly versions = new RouteVersionSnapshot(CLASSES_VERSION_FAMILIES);

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeClassGroupListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readClassGroupListFilters(getUrl()),
		);
	}

	applySlice(data: ClassesPageSlice) {
		this.slice = data;
		this.versions.markLoaded();
	}

	clear() {
		this.slice = null;
	}

	get selectedId() {
		return classGroupIdFromUrl(this.getUrl());
	}

	get selected() {
		const id = this.selectedId;
		if (!id) {
			return undefined;
		}
		return this.classGroupById(id);
	}

	classGroupById(id: string): ClassNode | undefined {
		return academicContext.classes.find(entry => entry.id === id);
	}

	staffAssignmentsForClassGroup(classGroupId: string): StaffAssignment[] {
		return this.staffAssignments.filter(
			row => row.classGroupId === classGroupId && !row.classSubjectId,
		);
	}

	seedStaff(members: StaffMember[]) {
		this.staff = mergeById(this.staff, members);
	}

	mergeStaffAssignments(rows: readonly StaffAssignment[]) {
		this.staffAssignments = mergeById(this.staffAssignments, rows);
	}

	upsertStaffAssignment(row: StaffAssignment) {
		this.staffAssignments = mergeById(this.staffAssignments, [row]);
	}

	removeStaffAssignment(id: string) {
		this.staffAssignments = this.staffAssignments.filter(row => row.id !== id);
	}

	seedPermissionCatalog(catalog: PermissionCatalogEntry[]) {
		this.permissionCatalog = catalog;
	}

	queryListPage() {
		return queryClassesListPage(this);
	}

	async refreshSlice() {
		const data = await loadClassesSlice();
		this.applySlice(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}

	async loadStaffDirectory() {
		const members = await fetchStaffDirectory();
		this.seedStaff(members);
	}

	async loadDrawerData(classGroupId: string) {
		const [assignments, catalog] = await Promise.all([
			fetchClassGroupStaffAssignments(classGroupId),
			this.permissionCatalog.length > 0
				? Promise.resolve(this.permissionCatalog)
				: fetchPermissionCatalogEntries(),
		]);

		await this.loadStaffDirectory();
		this.mergeStaffAssignments(assignments ?? []);
		if (this.permissionCatalog.length === 0) {
			this.seedPermissionCatalog(catalog);
		}
	}

	async ensurePermissionCatalog(): Promise<void> {
		if (this.permissionCatalog.length > 0) {
			return;
		}
		const catalog = await fetchPermissionCatalogEntries();
		this.seedPermissionCatalog(catalog);
	}

	async ensureDrawerSelection(classGroupId: string): Promise<boolean> {
		return ensureClassGroupDrawerSelection(this, classGroupId);
	}

	async createClassGroup(input: {
		name: string;
		gradeLevelId: string;
		capacity?: number | null;
		attendanceMode?: ClassAttendanceMode;
		homeroomStaffId?: string | null;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const sid = schoolId();
		if (!sid) {
			return false;
		}

		const id = nextClassId(input.gradeLevelId);
		const result = await runClassesRouteMutation({
			request: () => client.commands.createClassGroup({
				id,
				schoolId: sid,
				academicYearId: academicContext.yearId,
				gradeLevelId: input.gradeLevelId,
				name: input.name.trim(),
				capacity: input.capacity ?? null,
				attendanceMode: input.attendanceMode ?? 'session',
				homeroomStaffId: input.homeroomStaffId ?? null,
			}),
			successMessage: input.successMessage,
			onSuccess: async () => {
				await refreshAppShellData();
				await this.refreshSlice();
			},
		});
		return result !== null;
	}

	async updateClassGroup(input: {
		classGroupId: string;
		name: string;
		capacity?: number | null;
		attendanceMode?: ClassAttendanceMode;
		homeroomStaffId?: string | null;
		successMessage?: string;
	}): Promise<boolean> {
		const current = this.classGroupById(input.classGroupId);
		const client = getBrowserSchoolClient();
		if (!current) {
			return false;
		}

		const result = await runClassesRouteMutation({
			request: () => client.commands.updateClassGroupConfiguration({
				classGroupId: input.classGroupId,
				name: input.name.trim(),
				capacity: input.capacity !== undefined ? input.capacity : (current.capacity ?? null),
				attendanceMode: input.attendanceMode ?? current.attendanceMode,
				homeroomStaffId: input.homeroomStaffId !== undefined
					? input.homeroomStaffId
					: (current.homeroomStaffId ?? null),
			}),
			successMessage: input.successMessage,
			onSuccess: async () => {
				await refreshAppShellData();
				await this.refreshSlice();
			},
		});
		return result !== null;
	}

	async saveStaffAssignment(input: {
		assignment: StaffAssignment;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const previous = this.staffAssignments.find(row => row.id === input.assignment.id);

		const result = await runClassesRouteMutation({
			request: () => client.entities.staffAssignments.save(input.assignment),
			successMessage: input.successMessage,
			apply: () => this.upsertStaffAssignment(input.assignment),
			rollback: () => {
				if (previous) {
					this.upsertStaffAssignment(previous);
				}
				else {
					this.removeStaffAssignment(input.assignment.id);
				}
			},
		});
		return result !== null;
	}

	async deleteStaffAssignment(input: {
		id: string;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const previous = this.staffAssignments.find(row => row.id === input.id);
		if (!previous) {
			return false;
		}

		const result = await runClassesRouteMutation({
			request: () => client.entities.staffAssignments.delete({ id: input.id }),
			successMessage: input.successMessage,
			apply: () => this.removeStaffAssignment(input.id),
			rollback: () => this.upsertStaffAssignment(previous),
		});
		return result !== null;
	}

	buildStaffAssignmentPayload(input: {
		id: string;
		staffId: string;
		responsibility: string;
		permissions: StaffAssignment['permissions'];
		classGroupId: string;
	}): StaffAssignment {
		return createStaffAssignmentPayload(input);
	}
}

export function setClassesPageState(state: ClassesPageState) {
	setContext(CLASSES_PAGE_STATE_KEY, state);
}

export function getClassesPageState() {
	return getContext<ClassesPageState>(CLASSES_PAGE_STATE_KEY);
}
