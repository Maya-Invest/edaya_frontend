import type { InboxPageSlice } from './lib/inbox-helpers';
import { fetchInboxDeliveries, toInboxDelivery, INBOX_PAGE_SIZE } from '$lib/api/notifications-inbox-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { entityVersions } from '$lib/entity-versions.svelte';
 import { t } from '$lib/i18n';
 import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
 import { get } from 'svelte/store';
import { inboxDeliveryIdFromUrl, inboxFiltersFromUrl } from './lib/inbox-helpers';
import { inboxIdentity, inboxRecipient, loadInboxSlice, queryInboxListPage } from './lib/inbox-queries';
import { runInboxRouteMutation } from './lib/inbox-route-mutation';

const INBOX_PAGE_STATE_KEY = Symbol('inbox-page-state');
export type { InboxPageSlice };
export class InboxPageState {
  slice = $state<InboxPageSlice | null>(null);
  loadingMore = $state(false);
  loadMoreError = $state(false);
  markingRead = $state(false);
  private generation = 0;
 private listKey = '';
 private collectionKey(url: URL) {
 return JSON.stringify([inboxIdentity(), inboxFiltersFromUrl(url)]);
 }

 loadSlice(url: URL) {
 const existing = this.slice && this.listKey === this.collectionKey(url) ? { deliveries: this.deliveries, total: this.total } : undefined;
 return loadInboxSlice(url, existing);
 }

  private offset = $state(0);
  private identity = $state('');
  private readonly versions = new RouteVersionSnapshot(['inbox']);
  constructor(private readonly getUrl: () => URL) {}
  applySlice(data: InboxPageSlice) {
    this.generation++;
    this.slice = data;
    if (this.listKey !== this.collectionKey(this.getUrl()))
this.offset = data.deliveries.length;
 this.listKey = this.collectionKey(this.getUrl());
    this.identity = inboxIdentity();
    this.loadMoreError = false;
    this.loadingMore = false;
    this.versions.markLoaded();
  }

  clear() {
 this.generation++;
 this.slice = null;
 this.listKey = '';
 this.offset = 0;
 this.identity = '';
}

  get deliveries() { return this.identity === inboxIdentity() ? this.slice?.deliveries ?? [] : []; }
  get total() { return this.identity === inboxIdentity() ? this.slice?.total ?? 0 : 0; }
  get subjectId() { return this.identity === inboxIdentity() ? this.slice?.subjectId ?? null : null; }
  get selectedId() { return inboxDeliveryIdFromUrl(this.getUrl()); }
  get selected() { return this.identity === inboxIdentity() && this.slice?.selectedDelivery?.id === this.selectedId ? this.slice?.selectedDelivery : undefined; }
  get hasMore() { return this.offset < this.total && !this.loadMoreError; }
  queryListPage() { return queryInboxListPage(this); }
  async refreshSlice() {
    const url = this.getUrl();
    const identity = inboxIdentity();
    const data = await loadInboxSlice(url, undefined, Math.max(INBOX_PAGE_SIZE, this.offset));
 if (identity === inboxIdentity() && url.href === this.getUrl().href)
this.offset = data.deliveries.length;
    if (identity === inboxIdentity() && url.href === this.getUrl().href)
      this.applySlice(data);
  }

  async invalidateIfStale() {
    if (this.versions.hasLoaded() && this.versions.isStale())
      await this.refreshSlice();
  }

  async loadMore() {
    const recipient = inboxRecipient();
    if (!recipient || this.loadingMore || !this.hasMore)
      return;
    const generation = this.generation;
    const identity = inboxIdentity();
    const url = this.getUrl();
    this.loadingMore = true;
    try {
      const rows = await fetchInboxDeliveries(getBrowserSchoolClient(), recipient, inboxFiltersFromUrl(url), this.offset);
      if (generation !== this.generation || identity !== inboxIdentity() || url.search !== this.getUrl().search)
        return;
      const seen = new SvelteSet(this.deliveries.map(row => row.id));
      if (this.slice)
        this.slice = { ...this.slice, deliveries: [...this.deliveries, ...rows.filter(row => !seen.has(row.id))] };
      this.offset += rows.length || this.total;
    }
    catch {
      if (generation === this.generation)
        this.loadMoreError = true;
    }
    finally {
      if (generation === this.generation)
        this.loadingMore = false;
    }
  }

  async markDeliveryRead(deliveryId: string): Promise<boolean> {
    if (this.markingRead || this.selected?.id !== deliveryId || this.selected.status !== 'sent')
      return false;
    this.markingRead = true;
    const identity = inboxIdentity();
    try {
      return await runInboxRouteMutation({
        request: () => getBrowserSchoolClient().commands.markDeliveryRead({ deliveryId }),
 successMessage: get(t)('account.inbox.markedRead'),
        onSuccess: async (raw) => {
          entityVersions.bump('inbox');
          if (identity !== inboxIdentity())
            return;
          if (this.slice)
            this.slice = { ...this.slice, selectedDelivery: toInboxDelivery(raw) };
          await this.refreshSlice();
        },
      }) !== null;
    }
    finally { this.markingRead = false; }
  }
}
export function setInboxPageState(state: InboxPageState) {
 setContext(INBOX_PAGE_STATE_KEY, state);
 }
export function getInboxPageState() {
 return getContext<InboxPageState>(INBOX_PAGE_STATE_KEY);
 }
