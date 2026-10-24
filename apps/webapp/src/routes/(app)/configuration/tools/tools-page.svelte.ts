import type { ImportTypeKey } from '$lib/import/catalog/types';
import type { UrlSyncedModalsState } from '$lib/modal/modal-state.svelte';
import type { ImportPageSlice } from './lib/import-helpers';
import type {
  ToolsModalName,
  ToolsWorkflowSurface,
} from './lib/tools-workflow';
import { academicContext } from '$lib/academic/context.svelte';
import { updateSchoolTimetableDefaultsMutation } from '$lib/api/mutations/school-timetable.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchSchoolById } from '$lib/api/school-data';
import { IMPORT_TYPE_DEFINITIONS } from '$lib/import/catalog/import-types';
import { createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
import { writeModalSurface } from '$lib/modal/modal-url';
import { replaceRouteSurface } from '$lib/navigation/route-surface-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { hasPermission } from '$lib/permissions';
import { getContext, setContext } from 'svelte';
import { DataImportState } from './import-state.svelte';
import { queryToolsListPage } from './lib/tools-queries';
import {
  canonicalToolsWorkflowSurface,
  retiredTimetableModalHref,
  TIMETABLE_SETUP_TABS,
  TOOL_MODAL_NAMES,
  TOOL_WORKFLOW_STEPS,
} from './lib/tools-workflow';
import { TimetablePlanningPageState } from './timetable-planning-page.svelte';

const TOOLS_VERSION_FAMILIES = [] as const;

const TOOLS_PAGE_STATE_KEY = Symbol('tools-page-state');

export type { ImportPageSlice };

export class ToolsPageState {
  readonly importState = new DataImportState();
  loadSchoolForForm = (...args: Parameters<typeof fetchSchoolById> extends [unknown, ...infer Rest] ? Rest : never) => fetchSchoolById(getBrowserSchoolClient(), ...args);

  performUpdateSchoolTimetableDefaults = (...args: Parameters<typeof updateSchoolTimetableDefaultsMutation>) => updateSchoolTimetableDefaultsMutation(...args);

  slice = $state<ImportPageSlice | null>(null);
  readonly planningPage = new TimetablePlanningPageState();
  readonly modals: UrlSyncedModalsState<ToolsModalName>;

  private readonly versions = new RouteVersionSnapshot(TOOLS_VERSION_FAMILIES);

  constructor(private readonly getUrl: () => URL) {
    this.modals = createUrlSyncedModals<ToolsModalName>({
      allowed: () => {
        const allowed: ToolsModalName[] = [];
        if (this.allowedImportTabs.length > 0) {
          allowed.push('import');
        }
        if (hasPermission('TIMETABLE_MANAGE')) {
          allowed.push('generate-timetable');
        }
        return allowed;
      },
      owned: TOOL_MODAL_NAMES,
      allowedSteps: TOOL_WORKFLOW_STEPS,
      allowedTabs: () => [...this.allowedImportTabs, ...TIMETABLE_SETUP_TABS],
      getUrl,
    });
  }

  get allowedImportTabs(): ImportTypeKey[] {
    return IMPORT_TYPE_DEFINITIONS
      .filter(definition => !definition.permission || hasPermission(definition.permission) || (definition.key === 'students' && hasPermission('STUDENT_MANAGE')))
      .map(definition => definition.key);
  }

  get defaultImportTab(): ImportTypeKey {
    return this.allowedImportTabs[0] ?? 'students';
  }

  hydrateWorkflow() {
    if (!academicContext.shellReady)
      return;
    const retiredHref = retiredTimetableModalHref(this.getUrl());
    if (retiredHref) {
      replaceRouteSurface(retiredHref);
      return;
    }
    this.modals.hydrate();
    const canonical = canonicalToolsWorkflowSurface({
      modal: this.modals.active,
      step: this.modals.step,
      tab: this.modals.tab,
    }, this.allowedImportTabs);
    if (
      (this.modals.target !== null && this.modals.active !== 'import')
      || canonical.modal !== this.modals.active
      || canonical.step !== this.modals.step
      || canonical.tab !== this.modals.tab
    ) {
      this.replaceWorkflowSurface(canonical);
    }
  }

  replaceWorkflowStep(step: string) {
    this.replaceWorkflowSurface({
      modal: this.modals.active,
      step,
      tab: this.modals.tab,
    });
  }

  private replaceWorkflowSurface(surface: ToolsWorkflowSurface) {
    const canonical = canonicalToolsWorkflowSurface(surface, this.allowedImportTabs);
    const currentUrl = this.getUrl();
    const href = writeModalSurface(currentUrl, {
      modal: canonical.modal,
      step: canonical.step,
      tab: canonical.tab,
      target: canonical.modal === 'import' ? this.modals.target : null,
    });
    this.modals.active = canonical.modal;
    if (canonical.modal !== 'import')
this.modals.target = null;
    this.modals.step = canonical.step;
    this.modals.tab = canonical.tab;
    if (href !== `${currentUrl.pathname}${currentUrl.search}`) {
      replaceRouteSurface(href);
    }
  }

  selectImportBatch(id: string | null) {
    this.modals.target = id;
    this.replaceWorkflowSurface({ modal: 'import', step: this.modals.step, tab: this.modals.tab });
  }

  applySlice(data: ImportPageSlice) {
    this.slice = data;
    this.versions.markLoaded();
  }

  clear() {
    this.importState.clear();
    this.slice = null;
  }

  queryListPage() {
    return queryToolsListPage(this);
  }

  async invalidateIfStale() {
    await this.planningPage.invalidateIfStale();
    if (!this.versions.isStale()) {
      return;
    }
    this.applySlice({ ready: true });
  }
}

export function setToolsPageState(state: ToolsPageState) {
  setContext(TOOLS_PAGE_STATE_KEY, state);
}

export function getToolsPageState() {
  return getContext<ToolsPageState>(TOOLS_PAGE_STATE_KEY);
}
