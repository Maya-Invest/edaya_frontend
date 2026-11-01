import { getContext, setContext } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';

const KEY = Symbol('dirty-work');
export interface DirtyWorkEntry {
  isDirty: () => boolean;
  discard: () => void;
  /** True only when this owner keeps the same draft mounted at the destination. */
  retainsDraft?: (destination: URL) => boolean;
}

/** Owned by the mounted application, never a user-specific SSR singleton. */
export class DirtyWork {
  pending = $state<(() => void) | null>(null);
  private entries = new SvelteSet<DirtyWorkEntry>();
  private pendingEntries: DirtyWorkEntry[] = [];
  register(entry: DirtyWorkEntry) {
    this.entries.add(entry);
    return () => this.entries.delete(entry);
  }

  private affected(destination?: URL) {
    return [...this.entries].filter(entry => entry.isDirty() && (!destination || !entry.retainsDraft?.(destination)));
  }

  hasDirtyWork(destination?: URL) { return this.affected(destination).length > 0; }
  request(proceed: () => void, destination?: URL) {
    const affected = this.affected(destination);
    if (affected.length === 0) {
proceed();
return;
}
    if (!this.pending) {
      this.pendingEntries = affected;
      this.pending = proceed;
    }
  }

  cancel() {
 this.pending = null;
		this.pendingEntries = [];
}

  discard() {
    const proceed = this.pending;
    this.pending = null;
    const affected = this.pendingEntries;
    this.pendingEntries = [];
    for (const entry of affected) {
      if (this.entries.has(entry) && entry.isDirty())
        entry.discard();
    }
    proceed?.();
  }
}

export function provideDirtyWork() {
return setContext(KEY, new DirtyWork());
}
export function getDirtyWork(): DirtyWork | undefined {
return getContext(KEY);
}
