import type { SubjectCategoryOption } from '$lib/api/subject-categories-data';
import type { SubjectCategoriesPageSlice } from './lib/subject-categories-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readSubjectCategoryListFilters, writeSubjectCategoryListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { loadSubjectCategoriesSlice, querySubjectCategoriesListPage } from './lib/subject-categories-queries';
import { runSubjectCategoriesRouteMutation } from './lib/subject-categories-route-mutation';

const SUBJECT_CATEGORIES_PAGE_STATE_KEY = Symbol('subject-categories-page-state');

export type { SubjectCategoriesPageSlice };

export class SubjectCategoriesPageState {
	slice = $state<SubjectCategoriesPageSlice | null>(null);

	readonly filters: ListFiltersState<{ q: string }>;

	private readonly versions = new RouteVersionSnapshot(['subjects']);

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeSubjectCategoryListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readSubjectCategoryListFilters(getUrl()),
		);
	}

	applySlice(data: SubjectCategoriesPageSlice) {
		this.slice = data;
		this.versions.markLoaded();
	}

	clear() {
		this.slice = null;
	}

	get categories() {
		return this.slice?.categories ?? [];
	}

	upsertCategory(category: SubjectCategoryOption) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			categories: [category, ...this.slice.categories.filter(entry => entry.id !== category.id)]
				.sort((left, right) => left.name.localeCompare(right.name)),
		};
	}

	removeCategory(id: string) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			categories: this.slice.categories.filter(entry => entry.id !== id),
		};
	}

	queryListPage() {
		return querySubjectCategoriesListPage(this);
	}

	async refreshSlice() {
		const data = await loadSubjectCategoriesSlice();
		this.applySlice(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}

	private schoolId(): string | null {
		return authSession.schoolId ?? academicContext.schools[0]?.id ?? null;
	}

	async saveCategory(input: {
		id?: string;
		name: string;
		successMessage?: string;
	}): Promise<boolean> {
		const schoolId = this.schoolId();
		if (!schoolId) {
			return false;
		}
		const client = getBrowserSchoolClient();
		const id = input.id ?? `subject-category-${Date.now().toString(36)}`;
		const entity: SubjectCategoryOption = {
			id,
			schoolId,
			name: input.name.trim(),
		};
		const previous = input.id ? this.categories.find(entry => entry.id === input.id) : undefined;
		const result = await runSubjectCategoriesRouteMutation({
			request: () => client.commands.configureSubjectCategory({
				id,
				name: entity.name,
			}),
			successMessage: input.successMessage,
			apply: () => this.upsertCategory(entity),
			rollback: () => {
				if (previous) {
					this.upsertCategory(previous);
				}
				else {
					this.removeCategory(id);
				}
			},
		});
		return result !== null;
	}

	async deleteCategory(input: {
		categoryId: string;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const previous = this.categories.find(entry => entry.id === input.categoryId);
		const result = await runSubjectCategoriesRouteMutation({
			request: () => client.entities.subjectCategories.delete({ id: input.categoryId }),
			successMessage: input.successMessage,
			apply: () => this.removeCategory(input.categoryId),
			rollback: () => {
				if (previous) {
					this.upsertCategory(previous);
				}
			},
		});
		return result !== null;
	}
}

export function setSubjectCategoriesPageState(state: SubjectCategoriesPageState) {
	setContext(SUBJECT_CATEGORIES_PAGE_STATE_KEY, state);
}

export function getSubjectCategoriesPageState() {
	return getContext<SubjectCategoriesPageState>(SUBJECT_CATEGORIES_PAGE_STATE_KEY);
}
