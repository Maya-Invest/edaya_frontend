import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { GradeScale } from '$lib/types/report-cards';
import type { GradeScalesPageSlice } from './lib/grade-scales-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { buildGradeScaleRanges } from '$lib/api/grade-scale-ranges';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readGradeScaleListFilters, writeGradeScaleListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { loadGradeScalesSlice, queryGradeScalesListPage } from './lib/grade-scales-queries';
import { runGradeScalesRouteMutation } from './lib/grade-scales-route-mutation';

const GRADE_SCALES_VERSION_FAMILIES = ['reportCards'] as const satisfies readonly EntityVersionKey[];

const GRADE_SCALES_PAGE_STATE_KEY = Symbol('grade-scales-page-state');

export type { GradeScalesPageSlice };

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
}

export class GradeScalesPageState {
	slice = $state<GradeScalesPageSlice | null>(null);

	readonly filters: ListFiltersState<{ q: string }>;

	private readonly versions = new RouteVersionSnapshot(GRADE_SCALES_VERSION_FAMILIES);

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeGradeScaleListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readGradeScaleListFilters(getUrl()),
		);
	}

	applySlice(data: GradeScalesPageSlice) {
		this.slice = data;
		this.versions.markLoaded();
	}

	clear() {
		this.slice = null;
	}

	get scales() {
		return this.slice?.scales ?? [];
	}

	upsertScale(scale: GradeScale) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			scales: [scale, ...this.slice.scales.filter(entry => entry.id !== scale.id)],
		};
	}

	removeScale(id: string) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			scales: this.slice.scales.filter(scale => scale.id !== id),
		};
	}

	scaleFor(id: string) {
		return this.scales.find(scale => scale.id === id);
	}

	queryListPage() {
		return queryGradeScalesListPage(this);
	}

	async refreshSlice(options?: { keepCurrentOnEmpty?: boolean }) {
		try {
			const data = await loadGradeScalesSlice();
			if (options?.keepCurrentOnEmpty && data.scales.length === 0 && this.scales.length > 0) {
				return;
			}
			this.applySlice(data);
		}
		catch {
			// Keep the current row if reload fails after a persisted write.
		}
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}

	async createScale(input: {
		name: string;
		minScore: number;
		maxScore: number;
		passingScore: number;
		decimalPlaces?: number;
		description?: string;
		successMessage?: string;
	}): Promise<boolean> {
		const sid = schoolId();
		if (!sid) {
			return false;
		}

		const client = getBrowserSchoolClient();
		const id = `gs-${Date.now().toString(36)}`;
		const optimistic: GradeScale = {
			id,
			schoolId: sid,
			name: input.name.trim(),
			minScore: input.minScore,
			maxScore: input.maxScore,
			passingScore: input.passingScore,
			decimalPlaces: input.decimalPlaces ?? 2,
			description: input.description,
			isDefault: false,
		};

		const result = await runGradeScalesRouteMutation({
			request: () => client.commands.createGradeScale({
				id,
				schoolId: sid,
				name: input.name.trim(),
				minScore: input.minScore,
				maxScore: input.maxScore,
				decimalPlaces: input.decimalPlaces ?? 2,
				isDefault: false,
				ranges: buildGradeScaleRanges(input.minScore, input.maxScore, input.passingScore),
			}),
			successMessage: input.successMessage,
			apply: () => this.upsertScale(optimistic),
			rollback: () => this.removeScale(id),
			onSuccess: () => this.refreshSlice({ keepCurrentOnEmpty: true }),
		});
		return result !== null;
	}

	async updateScale(input: {
		scaleId: string;
		name: string;
		minScore: number;
		maxScore: number;
		passingScore: number;
		decimalPlaces?: number;
		description?: string;
		successMessage?: string;
	}): Promise<boolean> {
		const existing = this.scaleFor(input.scaleId);
		if (!existing) {
			return false;
		}

		const client = getBrowserSchoolClient();
		const patch = {
			name: input.name.trim(),
			minScore: input.minScore,
			maxScore: input.maxScore,
			passingScore: input.passingScore,
			decimalPlaces: input.decimalPlaces ?? existing.decimalPlaces,
			description: input.description?.trim() || existing.description,
		};

		const result = await runGradeScalesRouteMutation({
			request: () => client.entities.gradeScales.save({
				id: existing.id,
				schoolId: existing.schoolId,
				name: patch.name,
				minScore: patch.minScore,
				maxScore: patch.maxScore,
				decimalPlaces: patch.decimalPlaces,
				description: patch.description || null,
				isDefault: existing.isDefault ?? false,
				ranges: buildGradeScaleRanges(patch.minScore, patch.maxScore, patch.passingScore),
			}),
			successMessage: input.successMessage,
			apply: () => this.upsertScale({ ...existing, ...patch }),
			rollback: () => this.upsertScale(existing),
			onSuccess: () => this.refreshSlice({ keepCurrentOnEmpty: true }),
		});
		return result !== null;
	}

	async deleteScale(input: {
		scaleId: string;
		successMessage?: string;
	}): Promise<boolean> {
		const previous = this.scaleFor(input.scaleId);
		if (!previous) {
			return false;
		}

		const client = getBrowserSchoolClient();
		const result = await runGradeScalesRouteMutation({
			request: () => client.entities.gradeScales.delete({ id: input.scaleId }),
			successMessage: input.successMessage,
			apply: () => this.removeScale(input.scaleId),
			rollback: () => this.upsertScale(previous),
		});
		return result !== null;
	}
}

export function setGradeScalesPageState(state: GradeScalesPageState) {
	setContext(GRADE_SCALES_PAGE_STATE_KEY, state);
}

export function getGradeScalesPageState() {
	return getContext<GradeScalesPageState>(GRADE_SCALES_PAGE_STATE_KEY);
}
