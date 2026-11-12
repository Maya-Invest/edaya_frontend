import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { DisciplinaryActionCatalogItem, DisciplinaryActionKind } from '$lib/types/discipline';
import type { DisciplinePageSlice } from './lib/discipline-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readDisciplineCatalogListFilters, writeDisciplineCatalogListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { loadDisciplineSlice, queryDisciplineListPage } from './lib/discipline-queries';
import { runDisciplineRouteMutation } from './lib/discipline-route-mutation';

const DISCIPLINE_VERSION_FAMILIES = ['incidents'] as const satisfies readonly EntityVersionKey[];

const DISCIPLINE_PAGE_STATE_KEY = Symbol('discipline-page-state');

export type { DisciplinePageSlice };

export class DisciplinePageState {
	slice = $state<DisciplinePageSlice | null>(null);

	readonly filters: ListFiltersState<{ q: string; kind: string }>;

	private readonly versions = new RouteVersionSnapshot(DISCIPLINE_VERSION_FAMILIES);

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeDisciplineCatalogListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readDisciplineCatalogListFilters(getUrl()),
		);
	}

	applySlice(data: DisciplinePageSlice) {
		this.slice = data;
		this.versions.markLoaded();
	}

	clear() {
		this.slice = null;
	}

	get actions() {
		return this.slice?.actions ?? [];
	}

	upsertAction(action: DisciplinaryActionCatalogItem) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			actions: [action, ...this.slice.actions.filter(entry => entry.id !== action.id)],
		};
	}

	removeAction(id: string) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			actions: this.slice.actions.filter(entry => entry.id !== id),
		};
	}

	queryListPage() {
		return queryDisciplineListPage(this);
	}

	async refreshSlice() {
		const data = await loadDisciplineSlice();
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

	async saveAction(input: {
		id?: string;
		name: string;
		shortName?: string;
		kind: DisciplinaryActionKind;
		severity?: number;
		defaultDurationDays?: number;
		description?: string;
		successMessage?: string;
	}): Promise<boolean> {
		const schoolId = this.schoolId();
		if (!schoolId) {
			return false;
		}

		const client = getBrowserSchoolClient();
		const id = input.id ?? `disc-${Date.now().toString(36)}`;
		const entity: DisciplinaryActionCatalogItem = {
			id,
			schoolId,
			name: input.name.trim(),
			shortName: input.shortName,
			kind: input.kind,
			severity: input.severity,
			defaultDurationDays: input.defaultDurationDays,
			description: input.description?.trim() || undefined,
		};
		const previous = input.id ? this.actions.find(entry => entry.id === input.id) : undefined;

		const result = await runDisciplineRouteMutation({
			request: () => client.commands.configureDisciplinaryAction({
				id,
				name: entity.name,
				shortName: entity.shortName,
				kind: entity.kind,
				severity: entity.severity ?? null,
				defaultDurationDays: entity.defaultDurationDays ?? null,
				description: entity.description ?? null,
			}),
			successMessage: input.successMessage,
			apply: () => this.upsertAction(entity),
			rollback: () => {
				if (previous) {
					this.upsertAction(previous);
				}
				else {
					this.removeAction(id);
				}
			},
		});
		return result !== null;
	}

	async deleteAction(input: {
		actionId: string;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const previous = this.actions.find(entry => entry.id === input.actionId);

		const result = await runDisciplineRouteMutation({
			request: () => client.entities.disciplinaryActions.delete({ id: input.actionId }),
			successMessage: input.successMessage,
			apply: () => this.removeAction(input.actionId),
			rollback: () => {
				if (previous) {
					this.upsertAction(previous);
				}
			},
		});
		return result !== null;
	}
}

export function setDisciplinePageState(state: DisciplinePageState) {
	setContext(DISCIPLINE_PAGE_STATE_KEY, state);
}

export function getDisciplinePageState() {
	return getContext<DisciplinePageState>(DISCIPLINE_PAGE_STATE_KEY);
}
