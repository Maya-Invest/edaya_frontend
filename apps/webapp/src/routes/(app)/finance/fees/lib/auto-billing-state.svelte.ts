import { academicContext } from '$lib/academic/context.svelte';
import { financeCommand } from '$lib/api/finance-client';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { entityVersions } from '$lib/entity-versions.svelte';
import { ApiError } from '@maya-invest/edaya-api-client';
import { SvelteMap } from 'svelte/reactivity';

export interface AutoBillingOptions {
  canConfigureAutomatic: boolean;
  gradeLevels: { id: string; label: string }[];
  placementStatuses: { id: string; label: string; isActive: boolean }[];
}
export interface AutoBillingRun {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdCount: number;
  skippedCount: number;
  failureCode?: string;
  createdAt: string;
  updatedAt: string;
}

export class FeeAutoBillingState {
  options = $state<AutoBillingOptions | null>(null);
  optionsStatus = $state<'loading' | 'ready' | 'error' | 'denied'>('loading');
  runs = $state<AutoBillingRun[]>([]);
  status = $state<'loading' | 'ready' | 'error' | 'denied'>('loading');
  retrying = $state<string | null>(null);
  private optionsGeneration = 0;
  private watchGeneration = 0;
  private readonly progress = new SvelteMap<string, string>();

  get scopeKey() {
    return JSON.stringify([authSession.schoolId, authSession.userId, authSession.subjectId, authSession.sessionKind, academicContext.yearId]);
  }

  async loadOptions() {
    const generation = ++this.optionsGeneration;
    const scopeKey = this.scopeKey;
    this.options = null;
    this.optionsStatus = 'loading';
    try {
      const options = await financeCommand<AutoBillingOptions>(getBrowserSchoolClient(), 'getAutoBillingOptions', 'get-auto-billing-options', {});
      if (generation === this.optionsGeneration && scopeKey === this.scopeKey) {
        this.options = options;
        this.optionsStatus = 'ready';
      }
    }
    catch (error) {
      if (generation === this.optionsGeneration && scopeKey === this.scopeKey)
        this.optionsStatus = error instanceof ApiError && error.status === 403 ? 'denied' : 'error';
    }
  }

  watch(feeId: string) {
    const generation = ++this.watchGeneration;
    const scopeKey = this.scopeKey;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const progressKey = `${scopeKey}:${feeId}`;
    this.runs = [];
    this.status = 'loading';
    void this.loadOptions();
    const current = () => generation === this.watchGeneration && scopeKey === this.scopeKey;
    const refresh = async () => {
      try {
        const result = await financeCommand<{ runs: AutoBillingRun[] }>(getBrowserSchoolClient(), 'getFeeAutoBilling', 'get-fee-auto-billing', { catalogServiceId: feeId });
        if (!current())
          return;
        const fingerprint = JSON.stringify(result.runs.map(run => [run.id, run.status, run.createdCount]));
        const previous = this.progress.get(progressKey);
        if (fingerprint !== previous && (previous !== undefined || result.runs.some(run => run.createdCount > 0))) {
          for (const key of ['fees', 'billing', 'payments'] as const)
            entityVersions.bump(key);
        }
        this.progress.set(progressKey, fingerprint);
        this.runs = result.runs;
        this.status = 'ready';
      }
      catch (error) {
        if (current())
          this.status = error instanceof ApiError && error.status === 403 ? 'denied' : 'error';
      }
      if (current() && this.status !== 'denied')
        timer = setTimeout(() => { void refresh(); }, 3000);
    };
    void refresh();
    return () => {
      if (generation === this.watchGeneration)
        this.watchGeneration++;
      clearTimeout(timer);
    };
  }

  async retry(runId: string) {
    if (this.retrying)
      return;
    this.retrying = runId;
    const generation = this.watchGeneration;
    const scopeKey = this.scopeKey;
    try {
      const { runMutation } = await import('$lib/api/mutations/run-mutation');
      const result = await runMutation(() => financeCommand(getBrowserSchoolClient(), 'retryAutoBilling', 'retry-auto-billing', { runId, requestId: crypto.randomUUID() }), { versionKeys: ['fees', 'billing', 'payments'] });
      if (result && generation === this.watchGeneration && scopeKey === this.scopeKey)
        this.runs = this.runs.map(run => run.id === runId ? { ...run, status: 'pending', failureCode: undefined } : run);
      return Boolean(result);
    }
    finally { this.retrying = null; }
  }
}
