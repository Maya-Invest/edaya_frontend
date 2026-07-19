import type { StaffPageState } from '../../../staff-page.svelte';
import { getContext, setContext } from 'svelte';
import { resolveStaffPageLoad } from '../../../lib/staff-page-status';
import { staffDetailIdFromUrl } from '../../../lib/staff-selectors';

const STAFF_PERMISSIONS_TAB_KEY = Symbol('staff-permissions-tab');

export class StaffPermissionsTabState {
	loadedKey = $state<string | null>(null);

	constructor(private readonly getPage: () => StaffPageState) {}

	clear() {
		this.loadedKey = null;
	}

	isReady(key: string): boolean {
		return this.loadedKey === key && this.getPage().hasStaffPermissionData(key);
	}

	query() {
		return (url: URL) => resolveStaffPageLoad(url, {
			empty: () => ({}),
			load: async () => {
				const staffId = staffDetailIdFromUrl(url);
				if (!staffId) {
					return {};
				}
				const page = this.getPage();
				const scope = page.staffScope();
				const key = scope.schoolId && scope.academicYearId
					? `${scope.schoolId}:${scope.academicYearId}`
					: '';
				if (!key) {
					return {};
				}
				await page.loadPermissionData();
				this.loadedKey = key;
				return {};
			},
			hasItems: () => true,
			errorMessage: 'Unable to load staff permissions.',
		});
	}
}

export function setStaffPermissionsTabState(state: StaffPermissionsTabState) {
	setContext(STAFF_PERMISSIONS_TAB_KEY, state);
}

export function getStaffPermissionsTabState() {
	return getContext<StaffPermissionsTabState>(STAFF_PERMISSIONS_TAB_KEY);
}
