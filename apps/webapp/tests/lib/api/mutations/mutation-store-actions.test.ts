import type { components } from '$lib/api/schema';
import type { StaffPermissionAssignmentView } from '$lib/api/staff-permission-assignments-data';
import { mergeById } from '$lib/detail-data/seed-policies';
import { ApiError } from '@maya-invest/edaya-api-client';
import { describe, expect, it, mock } from 'bun:test';

mock.module('$lib/toast.svelte', () => ({
	toast: { success: () => {}, error: () => {} },
}));

mock.module('$lib/auth/bootstrap-app', () => ({
	bootstrapAppShell: async () => {},
	resetAppShellBootstrap: () => {},
}));

mock.module('$lib/entity-versions.svelte', () => ({
	entityVersions: {
		bump: () => {},
	},
}));

const { runMutation } = await import('$lib/api/mutations/run-mutation');

type Permission = components['schemas']['StaffPermissionAssignment']['permission'];

function permissionRow(id: string, permission: Permission = 'STUDENT_READ'): StaffPermissionAssignmentView {
	return {
		id,
		staffId: 'staff-1',
		schoolId: 'school-1',
		academicYearId: 'year-1',
		permission,
		scopeIds: '',
		status: 'active',
		sourceStaffAssignmentId: null,
		scopeLabel: 'School-wide',
		tenantWide: true,
		isSynced: false,
		hasMissingScope: false,
	};
}

function createStore() {
	const assignments: StaffPermissionAssignmentView[] = [];
	return {
		assignments,
		upsert(row: StaffPermissionAssignmentView) {
			const next = mergeById(assignments, [row]);
			assignments.splice(0, assignments.length, ...next);
		},
		remove(id: string) {
			const next = assignments.filter(row => row.id !== id);
			assignments.splice(0, assignments.length, ...next);
		},
		find(id: string) {
			return assignments.find(row => row.id === id);
		},
	};
}

function applyStaffPermissionSave(
	store: ReturnType<typeof createStore>,
	assignment: StaffPermissionAssignmentView,
	previous?: StaffPermissionAssignmentView,
) {
	store.upsert({
		...assignment,
		scopeLabel: previous?.scopeLabel ?? assignment.scopeIds ?? '—',
		tenantWide: (assignment.scopeIds ?? '') === '',
		isSynced: Boolean(assignment.sourceStaffAssignmentId),
		hasMissingScope: previous?.hasMissingScope ?? false,
	});
}

function rollbackStaffPermissionSave(
	store: ReturnType<typeof createStore>,
	assignmentId: string,
	previous?: StaffPermissionAssignmentView,
) {
	if (previous) {
		store.upsert(previous);
	}
	else {
		store.remove(assignmentId);
	}
}

describe('runMutation store actions', () => {
	it('applies optimistic patch before the request and keeps it on success', async () => {
		let status = 'pending';

		const result = await runMutation(async () => true, {
			apply: () => {
				status = 'cancelled';
			},
			rollback: () => {
				status = 'pending';
			},
		});

		expect(result).toBe(true);
		expect(status).toBe('cancelled');
	});

	it('rolls back optimistic patch when the request fails', async () => {
		let status = 'pending';

		const result = await runMutation(async () => {
			throw new ApiError(400, { message: 'failed' });
		}, {
			apply: () => {
				status = 'cancelled';
			},
			rollback: () => {
				status = 'pending';
			},
		});

		expect(result).toBeNull();
		expect(status).toBe('pending');
	});
});

describe('staff permission mutation store actions', () => {
	it('upserts a new assignment on successful save apply', async () => {
		const store = createStore();
		const assignment = permissionRow('spa-new', 'STUDENT_UPDATE');

		const result = await runMutation(async () => assignment, {
			apply: () => {
				applyStaffPermissionSave(store, assignment);
			},
			rollback: () => {
				rollbackStaffPermissionSave(store, assignment.id);
			},
		});

		expect(result?.id).toBe('spa-new');
		expect(store.find('spa-new')?.permission).toBe('STUDENT_UPDATE');
	});

	it('restores the previous assignment when save fails after apply', async () => {
		const store = createStore();
		const previous = permissionRow('spa-1', 'STUDENT_READ');
		store.upsert(previous);

		const assignment = permissionRow('spa-1', 'STUDENT_UPDATE');

		const result = await runMutation(async () => {
			throw new ApiError(400, { message: 'failed' });
		}, {
			apply: () => {
				applyStaffPermissionSave(store, assignment, previous);
			},
			rollback: () => {
				rollbackStaffPermissionSave(store, assignment.id, previous);
			},
		});

		expect(result).toBeNull();
		expect(store.find('spa-1')?.permission).toBe('STUDENT_READ');
	});

	it('removes the assignment on delete apply and restores it on rollback', async () => {
		const store = createStore();
		const previous = permissionRow('spa-1');
		store.upsert(previous);

		const deleted = await runMutation(async () => true, {
			apply: () => {
				store.remove('spa-1');
			},
			rollback: () => {
				store.upsert(previous);
			},
		});

		expect(deleted).toBe(true);
		expect(store.find('spa-1')).toBeUndefined();

		const failed = await runMutation(async () => {
			throw new ApiError(400, { message: 'failed' });
		}, {
			apply: () => {
				store.remove('spa-1');
			},
			rollback: () => {
				store.upsert(previous);
			},
		});

		expect(failed).toBeNull();
		expect(store.find('spa-1')?.id).toBe('spa-1');
	});
});
