import type { ClassesPageState } from '../classes-page.svelte';
import type { ClassesPageSlice } from './classes-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { staffAssignmentsForClassGroup } from '$lib/api/entity-list-filters';
import { fetchStaffMembers } from '$lib/api/staff-data';
import { loadPermissionCatalog } from '$lib/api/staff-permission-assignments-data';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { ApiError } from '@maya-invest/edaya-api-client';
import { classGroupIdFromUrl, emptyClassesSlice } from './classes-helpers';

export async function loadClassesSlice(): Promise<ClassesPageSlice> {
	return {
		classCount: academicContext.classes.length,
	};
}

export function queryClassesListPage(state: ClassesPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptyClassesSlice(),
		load: async () => {
			try {
				await state.loadStaffDirectory();
			}
			catch (error) {
				if (!(error instanceof ApiError && (error.status === 403 || error.status === 401))) {
					throw error;
				}
			}

			const data = await loadClassesSlice();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
	});
}

export async function ensureClassGroupDrawerSelection(
	state: ClassesPageState,
	classGroupId: string,
): Promise<boolean> {
	if (!state.classGroupById(classGroupId)) {
		return false;
	}

	try {
		await state.loadStaffDirectory();
		return true;
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
			return true;
		}
		throw error;
	}
}

export async function fetchClassGroupStaffAssignments(classGroupId: string) {
	const client = queryClient();
	return client.entities.staffAssignments.list(staffAssignmentsForClassGroup(classGroupId));
}

export async function fetchStaffDirectory() {
	const client = queryClient();
	const schoolId = academicContext.schools[0]?.id ?? '';
	if (!schoolId) {
		return [];
	}

	return fetchStaffMembers(client, {
		schoolId,
		academicYearId: academicContext.yearId,
	});
}

export async function fetchPermissionCatalogEntries() {
	return loadPermissionCatalog(queryClient());
}

export function queryClassGroupProfile(state: ClassesPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const id = classGroupIdFromUrl(url);
			if (id)
				await state.loadProfileTeachers(id);
			return {};
		},
		hasItems: () => true,
		errorMessage: 'Unable to load class teachers.',
	});
}
