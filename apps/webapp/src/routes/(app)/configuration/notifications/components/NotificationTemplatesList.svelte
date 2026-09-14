<script lang="ts">
	import type { NotificationSendChannel, NotificationTemplateKey } from '$lib/notification-templates/catalog';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { Pencil, RotateCcw } from '$lib/icons';
	import {
		listChannelsForTemplateKey,
		NOTIFICATION_TEMPLATE_CATEGORIES,
	} from '$lib/notification-templates/catalog';
	import { get } from 'svelte/store';
	import { getNotificationModals } from '../notifications-modals.svelte';
	import { getNotificationsPageState } from '../notifications-page.svelte';

	const notificationsPage = getNotificationsPageState();
	const modals = getNotificationModals();
	const document = $derived(notificationsPage.document);

	function openEdit(key: NotificationTemplateKey) {
		modals.open('edit', { target: key });
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
								<article class="rounded-2xl border border-border bg-card p-5 shadow-soft">
									<div class="mb-3 flex items-start justify-between gap-3">
										<div class="min-w-0">
											<h3 class="font-display font-semibold">
												{$t(`notificationTemplates.keys.${key}`)}
											</h3>
											<p class="mt-1 font-sans tabular-nums text-[11px] text-muted-foreground">
												{key}
											</p>
										</div>
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
									<p class="text-xs text-muted-foreground">
										{$t('notificationTemplates.channels')}: {channelLabel(key)}
									</p>
								</article>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		{/snippet}
	</PermissionGate>
</div>
