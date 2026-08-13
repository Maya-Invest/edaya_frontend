<script lang="ts">
	import type { NotificationChannel, NotificationTemplateKey } from '$lib/notification-templates/catalog';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { Pencil, RotateCcw } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import {
		channelsForTemplateKey,
		NOTIFICATION_TEMPLATE_CATEGORIES,
		NOTIFICATION_TEMPLATE_KEYS,
	} from '$lib/notification-templates/catalog';
	import { get } from 'svelte/store';
	import { getNotificationsPageState } from '../notifications-page.svelte';
	import NotificationTemplateEditModal from './NotificationTemplateEditModal.svelte';

	const notificationsPage = getNotificationsPageState();
	const document = $derived(notificationsPage.document);

	const modals = createUrlSyncedModals({
		allowed: ['edit', 'reset-all'],
		allowedTabs: ['reset-key'],
		getUrl: () => $page.url,
	});
	$effect(() => {
		modals.hydrate();
	});
	const editOpen = bindUrlModal(modals, 'edit');
	const resetAllOpen = bindUrlModal(modals, 'reset-all');

	let resetting = $state(false);

	function isTemplateKey(value: string | null): value is NotificationTemplateKey {
		return value !== null && NOTIFICATION_TEMPLATE_KEYS.includes(value as NotificationTemplateKey);
	}

	const editKey = $derived.by((): NotificationTemplateKey | null => {
		const target = modals.target;
		return modals.active === 'edit' && document && isTemplateKey(target) ? target : null;
	});
	const resetKeyConfirmOpen = $derived(
		editKey !== null && modals.active === 'edit' && modals.tab === 'reset-key',
	);

	$effect(() => {
		if (!modals.ready) {
			return;
		}
		if (modals.active === 'reset-all') {
			if (modals.target !== null || modals.tab !== null) {
				modals.open('reset-all');
			}
			return;
		}
		if (modals.active === 'edit' && !editKey) {
			modals.close();
		}
	});

	function openEdit(key: NotificationTemplateKey) {
		modals.open('edit', { target: key });
	}

	async function confirmResetAll() {
		if (resetting || !document?.schoolId) {
			return;
		}

		resetting = true;
		try {
			const result = await notificationsPage.resetTemplates({
				successMessage: get(t)('notificationTemplates.toastResetAll'),
			});
			if (result) {
				resetAllOpen.open = false;
			}
		}
		finally {
			resetting = false;
		}
	}

	async function confirmResetKey() {
		const target = editKey;
		if (resetting || !target || !document?.schoolId) {
			return;
		}

		resetting = true;
		try {
			const result = await notificationsPage.resetTemplates({
				templateKey: target,
				successMessage: get(t)('notificationTemplates.toastResetKey'),
			});
			if (result) {
				modals.close();
			}
		}
		finally {
			resetting = false;
		}
	}

	function channelLabel(key: NotificationTemplateKey): string {
		return channelsForTemplateKey(key)
			.map((channel: NotificationChannel) => get(t)(`notificationTemplates.channel.${channel}`))
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
						disabled={disabled || resetting || !document}
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
											<p class="mt-1 font-mono text-[11px] text-muted-foreground">
												{key}
											</p>
										</div>
										<RowActionMenu>
											<RowActionMenuItem
												disabled={disabled || !document}
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

{#if editKey}
	{#key editKey}
		<NotificationTemplateEditModal
			bind:open={editOpen.open}
			templateKey={editKey}
			onReset={() => modals.setTab('reset-key')}
		/>
	{/key}
{/if}

<ConfirmModal
	bind:open={resetAllOpen.open}
	title={$t('notificationTemplates.resetAll')}
	description={$t('notificationTemplates.resetAllConfirm')}
	confirmLabel={$t('notificationTemplates.resetAll')}
	cancelLabel={$t('common.cancel')}
	busy={resetting}
	onConfirm={confirmResetAll}
/>

<ConfirmModal
	open={resetKeyConfirmOpen}
	title={editKey ? $t(`notificationTemplates.keys.${editKey}`) : ''}
	description={$t('notificationTemplates.resetKeyConfirm')}
	confirmLabel={$t('notificationTemplates.resetKey')}
	cancelLabel={$t('common.cancel')}
	busy={resetting}
	onOpenChange={(open) => {
		if (!open && modals.active === 'edit') {
			modals.setTab(null);
		}
	}}
	onConfirm={confirmResetKey}
/>
