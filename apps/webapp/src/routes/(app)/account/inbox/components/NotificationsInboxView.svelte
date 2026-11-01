<script lang="ts">
	import type { InboxDelivery } from '$lib/api/notifications-inbox-data';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { authSession } from '$lib/auth/session.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import DrawerFrame from '$lib/components/ui/DrawerFrame.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import TableTimestamp from '$lib/components/ui/TableTimestamp.svelte';
	import { locale, t } from '$lib/i18n';
	import { ArrowLeft, X } from '$lib/icons';
	import { provideCollectionPresentation } from '$lib/list/collection-presentation.svelte';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { appPath, appGoto } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { BADGE, BADGE_DANGER, BADGE_INFO, BADGE_WARN } from '$lib/ui-tones';
	import { tick } from 'svelte';
	import { SvelteURL } from 'svelte/reactivity';
	import { getInboxPageState } from '../inbox-page.svelte';
	import { inboxFiltersFromUrl } from '../lib/inbox-helpers';

	provideCollectionPresentation();
	const { onSelect, onClose }: { onSelect: (delivery: InboxDelivery) => void; onClose: () => void } = $props();
	const inboxPage = getInboxPageState();
	const query = inboxPage.queryListPage();
	const selected = $derived(inboxPage.selected);
	const inboxFilters = new ListFiltersState({
		getUrl: () => $page.url,
		write: (url, values) => {
			const next = new SvelteURL(url);
			next.pathname = '/account/inbox';
			for (const [key, value] of Object.entries(values)) {
				if (value.trim() && value !== 'all')
					next.searchParams.set(key, value.trim());
				else next.searchParams.delete(key);
			}
			next.searchParams.delete('offset');
			return next.pathname + next.search;
		},
		goto: href => void appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
	}, () => ({ ...inboxFiltersFromUrl($page.url) }));
	$effect(() => inboxFilters.hydrate({ ...inboxFiltersFromUrl($page.url) }));
	const activeFilters = $derived(Number(inboxFilters.values.status !== 'all') + Number(inboxFilters.values.type !== 'all'));
	const columns = $derived([
		{ key: 'message', label: $t('account.inbox.subject'), span: 5, minWidth: 280, required: true },
		{ key: 'sender', label: $t('account.inbox.sender'), span: 3, minWidth: 168 },
		{ key: 'type', label: $t('account.inbox.typeColumn'), span: 2, minWidth: 120 },
		{ key: 'received', label: $t('account.inbox.receivedAt'), span: 2, minWidth: 152 },
		{ key: 'status', label: $t('account.inbox.statusLabel'), span: 2, minWidth: 104 },
	]);
	let returnFocus: HTMLElement | null = null;
	afterNavigate(async () => {
		await tick();
		if (!inboxPage.selectedId && returnFocus?.isConnected)
			returnFocus.focus({ preventScroll: true });
	});
	function fmtDate(value: string | undefined) {
		return value ? new Date(value).toLocaleString($locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }) : $t('account.inbox.notProvided');
	}
	function statusLabel(status: InboxDelivery['status']) {
		return $t(`account.inbox.status.${status === 'sent' ? 'unread' : status}`);
	}
	function deliveryType(delivery: InboxDelivery) {
		return $t(`account.inbox.type.${delivery.announcementId ? 'announcement' : 'notification'}`);
	}
</script>

<ListPageHeader eyebrow={inboxPage.subjectId ? $t('account.inbox.title') : undefined} title={inboxPage.subjectId ? $t(inboxPage.total === 1 ? 'account.inbox.countOne' : 'account.inbox.count', { n: inboxPage.total }) : $t('account.inbox.title')} filterCount={activeFilters} onResetFilters={() => inboxFilters.patchImmediate({ status: 'all', type: 'all' })}>
	{#snippet search()}<ListSearchField value={inboxFilters.values.search} oninput={event => inboxFilters.patch({ search: event.currentTarget.value })} onCommit={() => inboxFilters.syncNow()} placeholder={$t('account.inbox.search')} />{/snippet}
	{#snippet filters()}
		<div class="space-y-2"><Label for="inbox-status">{$t('account.inbox.statusLabel')}</Label><FilterSelect id="inbox-status" class="w-full" value={inboxFilters.values.status} options={['all', 'unread', 'read'].map(value => ({ value, label: $t(`account.inbox.status.${value}`) }))} onchange={value => inboxFilters.patchImmediate({ status: value })} /></div>
		<div class="space-y-2"><Label for="inbox-type">{$t('account.inbox.typeLabel')}</Label><FilterSelect id="inbox-type" class="w-full" value={inboxFilters.values.type} options={['all', 'announcement', 'notification'].map(value => ({ value, label: $t(`account.inbox.type.${value}`) }))} onchange={value => inboxFilters.patchImmediate({ type: value })} /></div>
	{/snippet}
</ListPageHeader>
<PageQuery {query} cache={false} preserveWhileLoading loadingSurfaceKey={() => '/account/inbox'} cacheKey={url => url.pathname + url.search} loadingTitle={$t('account.inbox.title')}>
	{#snippet children(data)}
		<DataState status={data.subjectId ? data.status : data.status === 'ready' ? 'empty' : data.status} errorMessage={data.errorMessage} emptyTitle={$t('account.inbox.title')} emptyDescription={data.subjectId ? $t('account.inbox.empty') : $t('account.notifications.noSubject')}>
			<ListEntityTable listKey="NotificationsInbox" {columns} rows={inboxPage.deliveries} highlightId={inboxPage.selectedId} total={inboxPage.total} visibleCount={inboxPage.deliveries.length} hasMore={inboxPage.hasMore} loadingMore={inboxPage.loadingMore} onLoadMore={() => void inboxPage.loadMore()} onRowClick={(delivery) => {
				returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
				onSelect(delivery);
			}} emptyLabel={$t('account.inbox.empty')}>
				{#snippet cell(delivery, column)}
					{@const key = column.key}
					{#if key === 'message'}
						<div class="min-w-0"><p class={`break-words text-sm ${delivery.status === 'sent' ? 'font-semibold' : 'font-normal'}`}>{delivery.title}</p><p class="mt-1 line-clamp-1 break-words text-xs font-normal text-muted-foreground">{delivery.body}</p></div>
					{:else if key === 'sender'}
						<p class="break-words text-sm">{delivery.senderName || $t(delivery.senderState === 'restricted' ? 'account.inbox.restricted' : delivery.senderState === 'unavailable' ? 'account.inbox.unavailable' : 'value.notProvided')}</p>
					{:else if key === 'type'}
						<p class="text-sm">{deliveryType(delivery)}</p>
					{:else if key === 'received'}
						<TableTimestamp value={delivery.sentAt} />
					{:else if key === 'status'}
						<span class={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${delivery.status === 'sent' ? BADGE_INFO : delivery.status === 'failed' ? BADGE_DANGER : delivery.status === 'pending' ? BADGE_WARN : BADGE}`}>{statusLabel(delivery.status)}</span>
					{/if}
				{/snippet}
			</ListEntityTable>
			{#if inboxPage.loadMoreError}<div class="mt-4 flex items-center gap-3"><p role="alert" class="text-sm text-destructive">{$t('messages.failed')}</p><Button variant="outline" onclick={() => {
				inboxPage.loadMoreError = false;
				void inboxPage.loadMore();
			}}>{$t('dataState.retry')}</Button></div>{/if}
		</DataState>
	{/snippet}
</PageQuery>
{#if selected}
	<DrawerFrame onClose={onClose} closeDisabled={inboxPage.markingRead} label={$t('account.inbox.detail')} testId="inbox-message-drawer">
		<header class="flex shrink-0 items-center justify-between gap-4 border-b border-border p-4 md:px-6">{#if $page.state.routeSurfaceParent?.startsWith('/account/inbox/')}<Button variant="ghost" size="icon" disabled={inboxPage.markingRead} aria-label={$t('common.back')} onclick={() => closeDetailDrawer($page.state.routeSurfaceParent!)}><ArrowLeft class="h-4 w-4" /></Button>{/if}<span class="min-w-0 flex-1 font-display text-lg font-semibold">{$t('account.inbox.detail')}</span><Button variant="ghost" size="icon" disabled={inboxPage.markingRead} onclick={onClose} aria-label={$t('common.close')}><X class="h-4 w-4" /></Button></header>
		<div class="scrollbar-thin min-h-0 flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
			<DrawerEntityHeader name={selected.title} summary={`${$t('account.inbox.sender')}: ${inboxPage.slice?.senderName || $t(inboxPage.slice?.senderState === 'restricted' ? 'account.inbox.restricted' : inboxPage.slice?.senderState === 'unavailable' ? 'account.inbox.unavailable' : 'account.inbox.notProvided')}`}>
				{#snippet chips()}<span class="text-xs text-muted-foreground">{statusLabel(selected.status)}</span>{/snippet}
				{#snippet actions()}{#if selected.status === 'sent'}<Button class="h-auto whitespace-normal" disabled={inboxPage.markingRead} onclick={() => void inboxPage.markDeliveryRead(selected.id)}>{$t('account.inbox.markRead')}</Button>{/if}{/snippet}
			</DrawerEntityHeader>
			<section><h4 class="mb-2 text-sm font-semibold">{$t('account.inbox.message')}</h4><p class="whitespace-pre-wrap break-words text-sm leading-relaxed">{selected.body}</p></section>
			<section class="border-t border-border pt-6"><h4 class="mb-3 text-sm font-semibold">{$t('account.inbox.deliveryContext')}</h4><dl class="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
				<div><dt class="text-xs text-muted-foreground">{$t('account.inbox.typeLabel')}</dt><dd class="mt-1">{deliveryType(selected)}</dd></div>
				<div><dt class="text-xs text-muted-foreground">{$t('account.inbox.recipient')}</dt><dd class="mt-1 break-words">{authSession.accountActor?.name || $t('account.inbox.notProvided')} · {$t(selected.recipientKind ? `drawer.${selected.recipientKind}` : 'value.notProvided')}</dd></div>
				<div><dt class="text-xs text-muted-foreground">{$t('account.inbox.receivedAt')}</dt><dd class="mt-1">{fmtDate(selected.sentAt)}</dd></div>
				<div><dt class="text-xs text-muted-foreground">{$t('account.inbox.readAt')}</dt><dd class="mt-1">{fmtDate(selected.readAt)}</dd></div>
			</dl>
				{#if selected.announcementId && inboxPage.slice?.announcementAvailable}<Button class="mt-4" variant="outline" onclick={() => void appGoto(appPath('/(app)/school/announcements/[[id]]', { id: selected.announcementId }))}>{$t('account.inbox.relatedAnnouncement')}</Button>{/if}
			</section>
		</div>

	</DrawerFrame>
{/if}
