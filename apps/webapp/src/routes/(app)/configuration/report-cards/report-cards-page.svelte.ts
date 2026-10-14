import type { components } from '$lib/api/schema';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { ReportCardDefinition } from '$lib/types/report-cards';
import type { ReportCardsPageSlice } from './lib/report-cards-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import {
  readReportCardDefinitionListFilters,
  writeReportCardDefinitionListFilters,
} from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { reportCardDefinitionIdFromUrl } from './lib/report-cards-helpers';
import { loadReportCardsSlice, queryReportCardsListPage } from './lib/report-cards-queries';
import { runReportCardsRouteMutation } from './lib/report-cards-route-mutation';

const REPORT_CARDS_VERSION_FAMILIES = ['reportCards'] as const satisfies readonly EntityVersionKey[];

const REPORT_CARDS_PAGE_STATE_KEY = Symbol('config-report-cards-page-state');

export type { ReportCardsPageSlice };

function schoolId(): string {
  return authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
}

export class ReportCardsPageState {
  slice = $state<ReportCardsPageSlice | null>(null);

  readonly filters: ListFiltersState<{ q: string; status: string }>;

  private readonly versions = new RouteVersionSnapshot(REPORT_CARDS_VERSION_FAMILIES);

  constructor(private readonly getUrl: () => URL) {
    this.filters = new ListFiltersState(
      {
        getUrl,
        write: writeReportCardDefinitionListFilters,
        goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
      },
      () => readReportCardDefinitionListFilters(getUrl()),
    );
  }

  applySlice(data: ReportCardsPageSlice) {
    this.slice = data;
    this.versions.markLoaded();
  }

  clear() {
    this.slice = null;
  }

  get subjects() { return this.slice?.subjects ?? []; }

  get scales() {
    return this.slice?.scales ?? [];
  }

  get definitions() {
    return this.slice?.definitions ?? [];
  }

  get selectedId() {
    return reportCardDefinitionIdFromUrl(this.getUrl());
  }

  get selected() {
    return this.selectedDefinition(this.selectedId);
  }

  selectedDefinition(id?: string) {
    if (!id) {
      return undefined;
    }
    return this.definitions.find(definition => definition.id === id);
  }

  upsertDefinition(definition: ReportCardDefinition) {
    if (!this.slice) {
      return;
    }
    this.slice = {
      ...this.slice,
      definitions: [definition, ...this.slice.definitions.filter(entry => entry.id !== definition.id)],
    };
  }

  removeDefinition(id: string) {
    if (!this.slice) {
      return;
    }
    this.slice = {
      ...this.slice,
      definitions: this.slice.definitions.filter(definition => definition.id !== id),
    };
  }

  patchDefinition(id: string, patch: Partial<ReportCardDefinition>) {
    if (!this.slice) {
      return;
    }
    this.slice = {
      ...this.slice,
      definitions: this.slice.definitions.map(definition =>
        definition.id === id ? { ...definition, ...patch } : definition,
      ),
    };
  }

  queryListPage() {
    return queryReportCardsListPage(this);
  }

  async refreshSlice(options?: { keepCurrentOnEmpty?: boolean }) {
    try {
      const data = await loadReportCardsSlice();
      if (
        options?.keepCurrentOnEmpty
        && data.definitions.length === 0
        && this.definitions.length > 0
      ) {
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

  async configureDefinition(input: Omit<components['schemas']['ConfigureReportCardDefinitionCommand'], 'requestId'>): Promise<boolean> {
    const result = await runReportCardsRouteMutation({
      request: () => getBrowserSchoolClient().commands.configureReportCardDefinition({ ...input, requestId: crypto.randomUUID() }),
      onSuccess: async () => { await this.refreshSlice({ keepCurrentOnEmpty: true }); },
    });
    return result !== null;
  }

  async createDefinition(input: {
    name: string;
    description?: string;
    gradeLevelId: string;
    gradeScaleId: string;
    successMessage?: string;
  }): Promise<string | null> {
    const sid = schoolId();
    const yearId = academicContext.yearId;
    if (!sid || !yearId) {
      return null;
    }

    const client = getBrowserSchoolClient();
    const id = `rcd-${Date.now().toString(36)}`;
    const optimistic: ReportCardDefinition = {
      id,
      schoolId: sid,
      name: input.name.trim(),
      academicYearId: yearId,
      gradeLevelId: input.gradeLevelId,
      gradeScaleId: input.gradeScaleId,
      status: 'draft',
      sections: [],
    };

    const result = await runReportCardsRouteMutation({
      request: () => client.commands.createReportCardDefinition({
        revision: 0,
        id,
        schoolId: sid,
        academicYearId: yearId,
        gradeLevelId: input.gradeLevelId,
        gradeScaleId: input.gradeScaleId,
        name: input.name.trim(),
        kind: 'default',
        status: 'draft',
        isDefault: false,
        description: input.description?.trim() || undefined,
      }),
      successMessage: input.successMessage,
      apply: () => this.upsertDefinition(optimistic),
      rollback: () => this.removeDefinition(id),
      onSuccess: () => this.refreshSlice({ keepCurrentOnEmpty: true }),
    });
    return result !== null ? id : null;
  }

  async publishDefinition(input: {
    definitionId: string;
    successMessage?: string;
  }): Promise<boolean> {
    const previous = this.selectedDefinition(input.definitionId);
    if (!previous) {
      return false;
    }

    const client = getBrowserSchoolClient();
    const result = await runReportCardsRouteMutation({
      request: async () => {
        const definition = await client.entities.definitions.get(input.definitionId);
        return client.entities.definitions.save({
          ...definition,
          status: 'published',
        });
      },
      successMessage: input.successMessage,
      apply: () => this.patchDefinition(input.definitionId, { status: 'published' }),
      rollback: () => this.upsertDefinition(previous),
      onSuccess: () => this.refreshSlice({ keepCurrentOnEmpty: true }),
    });
    return result !== null;
  }

  async deleteDefinition(input: {
    definitionId: string;
    successMessage?: string;
    onSuccess?: () => void;
  }): Promise<boolean> {
    const previous = this.selectedDefinition(input.definitionId);
    if (!previous) {
      return false;
    }

    const client = getBrowserSchoolClient();
    const result = await runReportCardsRouteMutation({
      request: () => client.entities.definitions.delete({ id: input.definitionId }),
      successMessage: input.successMessage,
      apply: () => this.removeDefinition(input.definitionId),
      rollback: () => this.upsertDefinition(previous),
      onSuccess: input.onSuccess,
    });
    return result !== null;
  }
}

export function setReportCardsPageState(state: ReportCardsPageState) {
  setContext(REPORT_CARDS_PAGE_STATE_KEY, state);
}

export function getReportCardsPageState() {
  return getContext<ReportCardsPageState>(REPORT_CARDS_PAGE_STATE_KEY);
}
