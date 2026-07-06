import type { components } from '$lib/api/schema';
import {
	createStaffAssignmentPayload,
	saveStaffAssignmentMutation,
} from '$lib/api/mutations/staff-assignments.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadPermissionCatalog } from '$lib/api/staff-permission-assignments-data';
import { loadClassSubjects } from '$lib/api/subjects-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { t } from '$lib/i18n';
import { pruneStaffAssignmentPermissions } from '$lib/school/staff-assignment-form-helpers';
import { get } from 'svelte/store';

type StaffAssignment = components['schemas']['StaffAssignment'];

export type StaffAssignmentTargetKind = 'class_group' | 'class_subject';

export async function ensureStaffPermissionCatalogLoaded(catalogLength: number): Promise<boolean> {
	if (catalogLength > 0) {
		return false;
	}
	const entries = await loadPermissionCatalog(getBrowserSchoolClient());
	detailDataContext.seedStaffPermissionData({
		assignments: detailDataContext.staffPermissionAssignments,
		catalog: entries,
	});
	return true;
}

export class StaffAssignmentFormState {
	busy = $state(false);
	targetKind = $state<StaffAssignmentTargetKind>('class_group');
	classGroupId = $state('');
	classSubjectId = $state('');
	responsibility = $state('');
	permissions = $state<StaffAssignment['permissions']>([]);
	catalogLoaded = $state(false);

	constructor(private readonly getStaffId: () => string) {}

	get canSubmit(): boolean {
		return this.responsibility.trim().length > 0
			&& this.classGroupId.length > 0
			&& (this.targetKind === 'class_group' || this.classSubjectId.length > 0);
	}

	hydrateForOpen(
		open: boolean,
		assignment: StaffAssignment | null,
		defaultClassGroupId: string,
	) {
		if (!open) {
			return;
		}
		if (assignment) {
			this.targetKind = assignment.classSubjectId ? 'class_subject' : 'class_group';
			this.classSubjectId = assignment.classSubjectId ?? '';
			this.classGroupId = assignment.classGroupId
				?? detailDataContext.subjects.find(subject => subject.id === assignment.classSubjectId)?.classId
				?? '';
			this.responsibility = assignment.responsibility;
			this.permissions = [...(assignment.permissions ?? [])];
		}
		else {
			this.targetKind = 'class_group';
			this.classGroupId = defaultClassGroupId;
			this.classSubjectId = '';
			this.responsibility = '';
			this.permissions = [];
		}
	}

	prunePermissions(allowedPermissions: readonly string[]) {
		const pruned = pruneStaffAssignmentPermissions(
			this.permissions,
			new Set(allowedPermissions),
		);
		if (pruned) {
			this.permissions = pruned;
		}
	}

	async loadCatalogIfNeeded(open: boolean, catalogLength: number) {
		if (!open || this.catalogLoaded || catalogLength > 0) {
			return;
		}
		const loaded = await ensureStaffPermissionCatalogLoaded(catalogLength);
		if (loaded) {
			this.catalogLoaded = true;
		}
	}

	async loadSubjectsIfNeeded(open: boolean, classGroupId: string) {
		if (!open || !classGroupId || detailDataContext.subjectsForClass(classGroupId).length > 0) {
			return;
		}
		const subjects = await loadClassSubjects(getBrowserSchoolClient(), classGroupId);
		detailDataContext.seedSubjects(subjects, { classId: classGroupId });
	}

	ensureClassSubjectSelected(open: boolean, subjectIds: readonly string[]) {
		if (!open || this.targetKind !== 'class_subject' || subjectIds.length === 0) {
			return;
		}
		if (this.classSubjectId && subjectIds.includes(this.classSubjectId)) {
			return;
		}
		this.classSubjectId = subjectIds[0] ?? '';
	}

	selectClassGroup(classGroupId: string) {
		this.classGroupId = classGroupId;
		this.classSubjectId = '';
	}

	async submit(assignment: StaffAssignment | null, onSuccess: () => void) {
		if (!this.canSubmit || this.busy) {
			return;
		}

		this.busy = true;
		const id = assignment?.id ?? `sa-${Date.now().toString(36)}`;
		const payload = createStaffAssignmentPayload({
			id,
			staffId: this.getStaffId(),
			responsibility: this.responsibility.trim(),
			permissions: this.permissions,
			classGroupId: this.targetKind === 'class_group' ? this.classGroupId : undefined,
			classSubjectId: this.targetKind === 'class_subject' ? this.classSubjectId : undefined,
		});

		const ok = await saveStaffAssignmentMutation({
			assignment: payload,
			successMessage: get(t)('staff.assignmentSaved'),
		});
		this.busy = false;

		if (ok) {
			onSuccess();
		}
	}
}

export class ClassGroupStaffAssignmentFormState {
	busy = $state(false);
	staffId = $state('');
	responsibility = $state('');
	permissions = $state<StaffAssignment['permissions']>([]);
	catalogLoaded = $state(false);

	constructor(private readonly getDefaultStaffId: () => string) {}

	get canSubmit(): boolean {
		return this.responsibility.trim().length > 0 && this.staffId.length > 0;
	}

	hydrateForOpen(open: boolean, assignment: StaffAssignment | null) {
		if (!open) {
			return;
		}
		if (assignment) {
			this.staffId = assignment.staffId;
			this.responsibility = assignment.responsibility;
			this.permissions = [...(assignment.permissions ?? [])];
		}
		else {
			this.staffId = this.getDefaultStaffId();
			this.responsibility = '';
			this.permissions = [];
		}
	}

	prunePermissions(allowedPermissions: readonly string[]) {
		const pruned = pruneStaffAssignmentPermissions(
			this.permissions,
			new Set(allowedPermissions),
		);
		if (pruned) {
			this.permissions = pruned;
		}
	}

	async loadCatalogIfNeeded(open: boolean, catalogLength: number) {
		if (!open || this.catalogLoaded || catalogLength > 0) {
			return;
		}
		const loaded = await ensureStaffPermissionCatalogLoaded(catalogLength);
		if (loaded) {
			this.catalogLoaded = true;
		}
	}

	async submit(
		assignment: StaffAssignment | null,
		classGroupId: string,
		onSuccess: () => void,
	) {
		if (!this.canSubmit || this.busy || !classGroupId) {
			return;
		}

		this.busy = true;
		const id = assignment?.id ?? `sa-${Date.now().toString(36)}`;
		const payload = createStaffAssignmentPayload({
			id,
			staffId: this.staffId,
			responsibility: this.responsibility.trim(),
			permissions: this.permissions,
			classGroupId,
		});

		const ok = await saveStaffAssignmentMutation({
			assignment: payload,
			successMessage: get(t)('classGroups.assignmentSaved'),
		});
		this.busy = false;

		if (ok) {
			onSuccess();
		}
	}
}
