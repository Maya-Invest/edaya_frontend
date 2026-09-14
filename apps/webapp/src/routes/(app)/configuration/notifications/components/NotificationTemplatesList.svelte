<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { NotificationSendChannel, NotificationTemplateKey } from '$lib/notification-templates/catalog';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { Pencil, RotateCcw } from '$lib/icons';
	import { writeModalSurface } from '$lib/modal/modal-url';
	import { appGoto } from '$lib/navigation/app-navigation';
	import {
		listChannelsForTemplateKey,
		NOTIFICATION_TEMPLATE_CATEGORIES,
	} from '$lib/notification-templates/catalog';
	import { cn } from '$lib/utils';
	import { SvelteURL } from 'svelte/reactivity';
	import { get } from 'svelte/store';
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
		title={$t('notificationTemplates.title')}
	>
		{#snippet primary()}
			<PermissionGate permission="SCHOOL_LIFECYCLE_MANAGE">
				{#snippet children({ disabled })}
					<Button
						size="sm"
						variant="outline"
						class="rounded-full"
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
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<PermissionGate permission="SCHOOL_LIFECYCLE_MANAGE" mode="disable">
		{#snippet children({ disabled })}
			<div class="space-y-8">
				<p class="max-w-3xl text-sm text-muted-foreground">
					{$t('notificationTemplates.intro')}
				</p>

				{#each NOTIFICATION_TEMPLATE_CATEGORIES as category (category.key)}
					<section class="space-y-3">
						<h2 class="font-display text-lg font-semibold">
							{$t(`notificationTemplates.categories.${category.key}`)}
						</h2>
						<div class="grid gap-3 lg:grid-cols-2">
							{#each category.keys as key (key)}
								{@const isSelected = key === selectedKey}
								<article
									data-testid="notification-template-card"
									data-template-key={key}
									class={cn(
										'rounded-2xl border bg-card p-5 shadow-soft transition-colors',
										isSelected ? 'border-primary/40 bg-primary/5' : 'border-border',
									)}
								>
									<div class="mb-3 flex items-start justify-between gap-3">
										<button
											type="button"
											class="min-w-0 flex-1 text-left"
											onclick={() => onSelect?.(key)}
										>
											<h3 class={cn('font-display font-semibold', isSelected && 'text-primary')}>
												{$t(`notificationTemplates.keys.${key}`)}
											</h3>
											<p class="mt-1 font-sans tabular-nums text-[11px] text-muted-foreground">
												{key}
											</p>
										</button>
										<RowActionMenu>
											<RowActionMenuItem
												disabled={disabled}
												onclick={() => openEdit(key)}
											>
												<Pencil class="h-4 w-4" />
												{$t('common.edit')}
											</RowActionMenuItem>
										</RowActionMenu>
									</div>
									<button
										type="button"
										class="w-full text-left text-xs text-muted-foreground"
										onclick={() => onSelect?.(key)}
									>
										{$t('notificationTemplates.channels')}: {channelLabel(key)}
									</button>
								</article>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		{/snippet}
	</PermissionGate>
</div>
