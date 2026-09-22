import type { PageQueryRequest } from '$lib/queries/page-status';
import type { ClassesPageState } from '../../../classes-page.svelte';
import { resolvePageLoad } from '$lib/queries/page-status';
import { getContext, setContext } from 'svelte';
import { classGroupIdFromUrl } from '../../../lib/classes-helpers';

const CLASS_GROUP_ASSIGNMENTS_TAB_KEY = Symbol('class-group-assignments-tab');

export class ClassGroupAssignmentsTabState {
	loadedClassGroupId = $state<string | null>(null);

	constructor(private readonly getPage: () => ClassesPageState) {}

	clear() {
		this.loadedClassGroupId = null;
	}

	query() {
		return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
			empty: () => ({}),
			load: async (signal) => {
				const classGroupId = classGroupIdFromUrl(url);
				if (!classGroupId) {
					return {};
				}

				await this.getPage().loadDrawerData(classGroupId);
				signal.throwIfAborted();
				this.loadedClassGroupId = classGroupId;
				return {};
			},
			hasItems: () => true,
			errorMessage: 'Unable to load class group assignments.',
		}, request);
	}
}

export function setClassGroupAssignmentsTabState(state: ClassGroupAssignmentsTabState) {
	setContext(CLASS_GROUP_ASSIGNMENTS_TAB_KEY, state);
}

export function getClassGroupAssignmentsTabState() {
	return getContext<ClassGroupAssignmentsTabState>(CLASS_GROUP_ASSIGNMENTS_TAB_KEY);
}
