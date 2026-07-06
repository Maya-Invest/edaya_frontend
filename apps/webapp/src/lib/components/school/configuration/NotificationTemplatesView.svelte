<script lang="ts">
	import type { SchoolNotificationTemplatesRow } from '$lib/api/notification-templates-data';
	import type { NotificationChannel, NotificationTemplateKey } from '$lib/notification-templates/catalog';
	import { page } from '$app/stores';
	import { resetSchoolNotificationTemplatesMutation } from '$lib/api/mutations/notification-templates.mutations';
	import NotificationTemplateEditModal from '$lib/components/school/configuration/NotificationTemplateEditModal.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { confirmAction } from '$lib/confirm-action';
	import { t } from '$lib/i18n';
	import { Pencil, RotateCcw } from '$lib/icons';
	import {
		channelsForTemplateKey,
		NOTIFICATION_TEMPLATE_CATEGORIES,

	} from '$lib/notification-templates/catalog';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { get } from 'svelte/store';

	const { data }: {
		data: {
			schoolId: string | null;
			document: SchoolNotificationTemplatesRow | null;
		};
	} = $props();

	let savedDocument = $state<SchoolNotificationTemplatesRow | null>(null);
	const document = $derived(savedDocument ?? data.document);

	const modals = createUrlSyncedModals({ allowed: ['edit'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const editOpen = bindUrlModal(modals, 'edit');

	let editKey = $state<NotificationTemplateKey | null>(null);
	let resetting = $state(false);

	function openEdit(key: NotificationTemplateKey) {
		editKey = key;
		editOpen.open = true;
	}

	function handleSaved(next: SchoolNotificationTemplatesRow) {
		savedDocument = next;
	}

	async function resetAll() {
		if (resetting || !document?.schoolId) {
			return;
		}
		if (!confirmAction(get(t)('notificationTemplates.resetAllConfirm'))) {
			return;
		}

		resetting = true;
		try {
			const result = await resetSchoolNotificationTemplatesMutation({
				schoolId: document.schoolId,
			}, {
				successMessage: get(t)('notificationTemplates.toastResetAll'),
				onSuccess: handleSaved,
			});
			if (result) {
				savedDocument = result;
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
						onclick={resetAll}
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
									{#snippet children()}
										<RowActionMenuItem
											disabled={disabled || !document}
											onclick={() => openEdit(key)}
										>
											<Pencil class="h-4 w-4" />
											{$t('common.edit')}
										</RowActionMenuItem>
									{/snippet}
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

<NotificationTemplateEditModal
	bind:open={editOpen.open}
	templateKey={editKey}
	{document}
	onSaved={handleSaved}
/>
