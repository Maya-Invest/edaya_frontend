import { describe, expect, it } from 'bun:test';

type Permission = 'STUDENT_READ' | 'STUDENT_UPDATE';

interface StaffPermissionAssignmentView {
	id: string;
	staffId: string;
	schoolId: string;
	academicYearId: string;
	permission: Permission;
	scopes: { kind: 'school' }[];
	status: 'active';
	scopeLabel: string;
	tenantWide: boolean;
	hasMissingScope: boolean;
}

function mergeById<T extends { id: string }>(existing: readonly T[], incoming: readonly T[]): T[] {
	const map = new Map(existing.map(item => [item.id, item]));
	for (const item of incoming) {
		map.set(item.id, item);
	}
	return [...map.values()];
}

/**
 * Mirrors `runMutation` apply/rollback without importing production modules.
 * `run-mutation.ts` pulls `$lib/toast.svelte` (`$state`), which bun test does not
 * compile on Linux CI unless a Svelte module loader is registered.
 */
async function runStoreMutation<T>(
	fn: () => Promise<T>,
	options: { apply?: () => void; rollback?: () => void },
): Promise<T | null> {
	options.apply?.();
	try {
		return await fn();
	}
	catch {
		options.rollback?.();
		return null;
	}
}

function permissionRow(id: string, permission: Permission = 'STUDENT_READ'): StaffPermissionAssignmentView {
	return {
		id,
		staffId: 'staff-1',
		schoolId: 'school-1',
		academicYearId: 'year-1',
		permission,
		scopes: [{ kind: 'school' }],
		status: 'active',
		scopeLabel: 'School-wide',
		tenantWide: true,
		hasMissingScope: false,
	};
}

function createStore() {
	const assignments: StaffPermissionAssignmentView[] = [];
	return {
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
		scopeLabel: previous?.scopeLabel ?? '—',
		tenantWide: assignment.scopes.some(scope => scope.kind === 'school'),
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

		const result = await runStoreMutation(async () => true, {
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

		const result = await runStoreMutation(async () => {
			throw new Error('failed');
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

		const result = await runStoreMutation(async () => assignment, {
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

		const result = await runStoreMutation(async () => {
			throw new Error('failed');
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

		const deleted = await runStoreMutation(async () => true, {
			apply: () => {
				store.remove('spa-1');
			},
			rollback: () => {
				store.upsert(previous);
			},
		});

		expect(deleted).toBe(true);
		expect(store.find('spa-1')).toBeUndefined();

		const failed = await runStoreMutation(async () => {
			throw new Error('failed');
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
