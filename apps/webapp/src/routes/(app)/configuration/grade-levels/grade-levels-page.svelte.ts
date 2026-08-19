import type { GradeLevel } from '$lib/types/school';
import type { GradeLevelsPageSlice } from './lib/grade-levels-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { refreshAppShellData } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { gradeLevelIdFromUrl } from './lib/grade-levels-helpers';
import {
	readGradeLevelsListFilters,
	writeGradeLevelsListFilters,
} from './lib/grade-levels-list-filters';
import { loadGradeLevelsSlice, queryGradeLevelsListPage } from './lib/grade-levels-queries';
import { runGradeLevelsRouteMutation } from './lib/grade-levels-route-mutation';

const GRADE_LEVELS_VERSION_FAMILIES = [] as const;

const GRADE_LEVELS_PAGE_STATE_KEY = Symbol('grade-levels-page-state');

export type { GradeLevelsPageSlice };

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
}

function nextGradeLevelId(name: string): string {
	const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	const base = slug ? `gl-${slug}` : `gl-${Date.now().toString(36)}`;
	let id = base;
	let index = 1;
	while (academicContext.gradeLevels.some(level => level.id === id)) {
		id = `${base}-${index}`;
		index += 1;
	}
	return id;
}

export class GradeLevelsPageState {
	slice = $state<GradeLevelsPageSlice | null>(null);

	readonly filters: ListFiltersState<{ q: string; cycle: string }>;

	private readonly versions = new RouteVersionSnapshot(GRADE_LEVELS_VERSION_FAMILIES);

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeGradeLevelsListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readGradeLevelsListFilters(getUrl()),
		);
	}

	applySlice(data: GradeLevelsPageSlice) {
		this.slice = data;
		this.versions.markLoaded();
	}

	clear() {
		this.slice = null;
	}

	get selectedId() {
		return gradeLevelIdFromUrl(this.getUrl());
	}

	get selected() {
		const id = this.selectedId;
		if (!id) {
			return undefined;
		}
		return this.gradeLevelById(id);
	}

	gradeLevelById(id: string): GradeLevel | undefined {
		return academicContext.gradeLevelById(id);
	}

	classCountFor(levelId: string): number {
		return academicContext.classes.filter(entry => entry.gradeLevelId === levelId).length;
	}

	queryListPage() {
		return queryGradeLevelsListPage(this);
	}

	async refreshSlice() {
		const data = await loadGradeLevelsSlice();
		this.applySlice(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}

	async saveGradeLevel(input: {
		id?: string;
		name: string;
		label: string;
		cycle: string;
		order: number;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const sid = schoolId();
		if (!sid) {
			return false;
		}

		const id = input.id ?? nextGradeLevelId(input.name);
		const entity = {
			id,
			schoolId: sid,
			name: input.name.trim(),
			label: input.label.trim(),
			cycle: input.cycle.trim() || null,
			order: input.order,
		};

		const result = await runGradeLevelsRouteMutation({
			request: () => client.commands.configureGradeLevel(entity),
			successMessage: input.successMessage,
			onSuccess: async () => {
				await refreshAppShellData();
				await this.refreshSlice();
			},
		});
		return result !== null;
	}

	async deleteGradeLevel(input: {
		gradeLevelId: string;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const result = await runGradeLevelsRouteMutation({
			request: () => client.entities.gradeLevels.delete({ id: input.gradeLevelId }),
			successMessage: input.successMessage,
			onSuccess: async () => {
				await refreshAppShellData();
				await this.refreshSlice();
			},
		});
		return result !== null;
	}
}

export function setGradeLevelsPageState(state: GradeLevelsPageState) {
	setContext(GRADE_LEVELS_PAGE_STATE_KEY, state);
}

export function getGradeLevelsPageState() {
	return getContext<GradeLevelsPageState>(GRADE_LEVELS_PAGE_STATE_KEY);
}
