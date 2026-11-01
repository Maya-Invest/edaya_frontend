<script lang="ts">
	import { provideCollectionPresentation } from '$lib/list/collection-presentation.svelte';

	provideCollectionPresentation();
	import type { ResolvedPathname } from '$app/types';
	import type { NotificationSendChannel, NotificationTemplateKey } from '$lib/notification-templates/catalog';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListEntityCards from '$lib/components/ui/ListEntityCards.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { Pencil, RotateCcw } from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { writeModalSurface } from '$lib/modal/modal-url';
	import { appGoto } from '$lib/navigation/app-navigation';
	import {
		listChannelsForTemplateKey,
		enabledChannelsForTemplateKey,
		NOTIFICATION_TEMPLATE_CATEGORIES,
	} from '$lib/notification-templates/catalog';
	import { SvelteURL } from 'svelte/reactivity';
	import { get } from 'svelte/store';
	import { matchesNotificationTemplate, notificationListFilters } from '../lib/notifications-list-filters';
	import { getNotificationModals } from '../notifications-modals.svelte';
	import { getNotificationsPageState } from '../notifications-page.svelte';

	const {
		selectedKey,
		onSelect,
	}: {
		selectedKey?: NotificationTemplateKey | null;
		onSelect?: (key: NotificationTemplateKey) => void;
	} = $props();

	const notificationsPage = getNotificationsPageState();
	const modals = getNotificationModals();
	const document = $derived(notificationsPage.document);

	const collectionFilters = new ListFiltersState({
		getUrl: () => $page.url,
		write: notificationListFilters.write,
		goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
	}, () => notificationListFilters.read($page.url));
	$effect(() => collectionFilters.hydrate(notificationListFilters.read($page.url)));
	const groups = $derived(NOTIFICATION_TEMPLATE_CATEGORIES.map(category => ({
		...category,
		keys: category.keys.filter(key => matchesNotificationTemplate(key, $t(`notificationTemplates.keys.${key}`), document, collectionFilters.values)),
	})));
	const matchingCount = $derived(groups.reduce((count, group) => count + group.keys.length, 0));
	const columns = $derived([
		{ key: 'name', label: $t('common.name'), span: 1, card: { zone: 'header' as const, showLabel: false } },
		{ key: 'channels', label: $t('notificationTemplates.channels'), span: 1, card: { zone: 'body' as const, showLabel: true } },
		{ key: 'configuration', label: $t('notificationTemplates.configurationState'), span: 1, card: { zone: 'footer' as const, showLabel: true } },
	]);

	function openEdit(key: NotificationTemplateKey) {
		const next = new SvelteURL($page.url);
		next.pathname = detailHref.configNotificationTemplate(key);
		appGoto(writeModalSurface(next, { modal: 'edit' }) as ResolvedPathname);
	}

	function channelLabel(key: NotificationTemplateKey): string {
		return listChannelsForTemplateKey(key)
			.map((channel: NotificationSendChannel) => get(t)(`notificationTemplates.channel.${channel}`))
			.join(' · ');
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('notificationTemplates.eyebrow')}
		title={`${$t('notificationTemplates.title')} (${matchingCount})`}
		filterCount={Number(collectionFilters.values.channel !== 'all')}
		onResetFilters={() => collectionFilters.patchImmediate({ channel: 'all' })}
	>
		{#snippet search()}
			<ListSearchField value={collectionFilters.values.q} placeholder={$t('common.search')} oninput={event => collectionFilters.patch({ q: event.currentTarget.value })} onCommit={() => collectionFilters.syncNow()} />
		{/snippet}
		{#snippet filters()}
			<label class="flex flex-col gap-2 text-sm">
				<span>{$t('notificationTemplates.channels')}</span>
				<FilterSelect aria-label={$t('notificationTemplates.channels')} value={collectionFilters.values.channel} options={[
					{ value: 'all', label: $t('filter.all') },
					...(['in_app', 'email', 'push', 'sms'] as const).map(channel => ({ value: channel, label: $t(`notificationTemplates.channel.${channel}`) })),
				]} onchange={channel => collectionFilters.patchImmediate({ channel })} />
			</label>
			<p class="text-xs text-muted-foreground">{$t('notificationTemplates.configurationUnavailable')}</p>
		{/snippet}
		{#snippet primary()}
			<PermissionGate permission="SCHOOL_LIFECYCLE_MANAGE">
				{#snippet children({ disabled })}
					<Button
						size="sm"
						variant="outline"

						disabled={disabled || !document}
						onclick={() => modals.open('reset-all')}
					>
						<RotateCcw class="mr-1 h-4 w-4" />
						{$t('notificationTemplates.resetAll')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<PermissionGate permission="SCHOOL_LIFECYCLE_MANAGE">
				<ListMoreMenu
					exportOnly
					onExport={() => void exportMatchingList({
						filename: 'notification-templates.csv',
						headers: ['category', 'name', 'key', 'channels'],
						loadAll: async () => groups.flatMap(category => category.keys.map(key => [
							get(t)(`notificationTemplates.categories.${category.key}`),
							get(t)(`notificationTemplates.keys.${key}`),
							key,
							channelLabel(key),
						])),
					})}
				/>
			</PermissionGate>
		{/snippet}
	</ListPageHeader>

	<PermissionGate permission="SCHOOL_LIFECYCLE_MANAGE">
		<p class="mb-6 max-w-3xl text-sm text-muted-foreground">{$t('notificationTemplates.intro')}</p>
		<div class="space-y-6">
			{#each groups as category (category.key)}
				{#if category.keys.length}
					<section class="space-y-4">
						<h3 class="text-xl font-semibold">{$t(`notificationTemplates.categories.${category.key}`)} ({category.keys.length})</h3>
						<ListEntityCards {columns} rows={category.keys.map(key => ({ id: key, key }))} highlightId={selectedKey ?? undefined}
							onRowClick={onSelect ? row => onSelect(row.key) : undefined}>
							{#snippet field(row, fieldKey)}
								{#if fieldKey === 'name'}
									<p class="break-words text-sm font-semibold">{$t(`notificationTemplates.keys.${row.key}`)}</p>
								{:else if fieldKey === 'channels'}
									{@const channels = enabledChannelsForTemplateKey(document, row.key)}
									<span>{channels ? channels.map(channel => $t(`notificationTemplates.channel.${channel}`)).join(' · ') : $t('dataState.unavailable')}</span>
								{:else}
									<span>{$t('dataState.unavailable')}</span>
								{/if}
							{/snippet}
							{#snippet actions(row)}
								<RowActionMenu label={`${$t('list.rowActions')} · ${$t(`notificationTemplates.keys.${row.key}`)}`}>
									<RowActionMenuItem disabled={!document} onclick={() => openEdit(row.key)}>
										<Pencil class="h-4 w-4" />{$t('common.edit')}
									</RowActionMenuItem>
								</RowActionMenu>
							{/snippet}
						</ListEntityCards>
					</section>
				{/if}
			{/each}
			{#if matchingCount === 0}<p role="status" class="p-4 text-sm">{$t('collection.noMatches')}</p>{/if}
		</div>
	</PermissionGate>
</div>
