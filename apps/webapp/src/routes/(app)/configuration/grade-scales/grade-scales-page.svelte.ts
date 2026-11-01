import type { components } from '$lib/api/schema';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { GradeScale } from '$lib/types/report-cards';
import type { GradeScalesPageSlice } from './lib/grade-scales-helpers';
import { mapGradeScales } from '$lib/api/report-cards-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
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

  async configureScale(input: Omit<components['schemas']['ConfigureGradeScaleCommand'], 'requestId'>): Promise<boolean> {
    const result = await runGradeScalesRouteMutation({
      request: () => getBrowserSchoolClient().commands.configureGradeScale({ ...input, requestId: crypto.randomUUID() }),
      onSuccess: saved => input.action === 'delete' ? this.removeScale(input.id) : this.upsertScale(mapGradeScales([saved])[0]),
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
