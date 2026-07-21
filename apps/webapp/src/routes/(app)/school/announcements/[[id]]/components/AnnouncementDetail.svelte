<script lang="ts">
	import type { Announcement } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { getAnnouncementsPageState } from '../../announcements-page.svelte';
	import AnnouncementFormModal from '../../components/AnnouncementFormModal.svelte';
	import { resolveAnnouncementTargetLabel } from '../../lib/announcement-target-label';
	import AnnouncementTargetFormModal from './AnnouncementTargetFormModal.svelte';

	const {
		announcement,
		onDeleted,
	}: {
		announcement: Announcement;
		onDeleted?: () => void;
	} = $props();

	type AnnouncementDrawerModal = 'add-target';

	const announcementsPage = getAnnouncementsPageState();
	const modals = createUrlSyncedModals<AnnouncementDrawerModal>({
		allowed: ['add-target'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const addTargetOpen = bindUrlModal(modals, 'add-target');

	const live = $derived(
		announcementsPage.findAnnouncement(announcement.id) ?? announcement,
	);
	const isDraft = $derived(live.status === 'draft');

	let publishOpen = $state(false);
	let deleteOpen = $state(false);
	let deleteBusy = $state(false);

	function fmtDate(value: string | undefined) {
		if (!value) {
			return '—';
		}
		return new Date(value).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function targetLabel(target: Announcement['targets'][number]) {
		return resolveAnnouncementTargetLabel(target, {
			academic: academicContext,
			detail: announcementsPage,
			labelForKind: kind => get(t)(`announcements.targetKind.${kind}`),
		});
	}

	function confirmPublish() {
		publishOpen = false;
		void announcementsPage.publishAnnouncement({
			announcementId: live.id,
			successMessage: get(t)('announcements.publishSuccess', { title: live.title }),
		});
	}

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await announcementsPage.deleteAnnouncement(live.id, {
				successMessage: get(t)('announcements.toastDeleted', { title: live.title }),
			});
			if (ok) {
				deleteOpen = false;
				onDeleted?.();
			}
		}
		finally {
			deleteBusy = false;
		}
	}

	const dateSummary = $derived.by(() => {
		const parts = [`${$t('announcements.createdAt')}: ${fmtDate(live.createdAt)}`];
		if (live.publishedAt) {
			parts.push(`${$t('announcements.publishedAt')}: ${fmtDate(live.publishedAt)}`);
		}
		if (live.expiresAt) {
			parts.push(`${$t('announcements.expiresAt')}: ${fmtDate(live.expiresAt)}`);
		}
		return parts.join(' · ');
	});
</script>

<div class="space-y-5">
	<DrawerEntityHeader name={live.title} summary={dateSummary}>
		{#snippet chips()}
			<span
				class={cn(
					'rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
					live.status === 'published'
						? 'bg-accent/20 text-foreground'
						: live.status === 'draft'
						? 'bg-secondary text-muted-foreground'
						: 'bg-muted text-muted-foreground',
				)}
			>
				{$t(`announcements.status.${live.status}`)}
			</span>
			<span class="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/80">
				{$t(`announcements.priority.${live.priority}`)}
			</span>
		{/snippet}
		{#snippet actions()}
			{#if isDraft}
				<PermissionGate
					permission="COMMUNICATION_CREATE"
					mode="disable"
					tooltip={$t('announcements.permissionCreate')}
				>
					{#snippet children({ disabled, title })}
						<AnnouncementFormModal announcement={live} {disabled} {title} />
					{/snippet}
				</PermissionGate>
				<PermissionGate
					permission="COMMUNICATION_CREATE"
					mode="disable"
					tooltip={$t('announcements.permissionCreate')}
				>
					{#snippet children({ disabled, title })}
						<Button
							size="sm"
							class="rounded-full"
							disabled={disabled || live.targets.length === 0}
							{title}
							onclick={() => (publishOpen = true)}
						>
							{$t('announcements.publish')}
						</Button>
					{/snippet}
				</PermissionGate>
			{/if}
		{/snippet}
		{#snippet overflow()}
			{#if isDraft}
				<PermissionGate
					permission="COMMUNICATION_CREATE"
					mode="disable"
					tooltip={$t('announcements.permissionCreate')}
				>
					{#snippet children({ disabled, title })}
						<RowActionMenuItem
							{disabled}
							{title}
							onclick={() => modals.open('add-target')}
						>
							{$t('announcements.addTarget')}
						</RowActionMenuItem>
						<RowActionMenuItem
							destructive
							{disabled}
							{title}
							onclick={() => (deleteOpen = true)}
						>
							{$t('common.delete')}
						</RowActionMenuItem>
					{/snippet}
				</PermissionGate>
			{/if}
		{/snippet}
	</DrawerEntityHeader>

	<p class="whitespace-pre-wrap text-sm text-foreground/80">{live.content}</p>

	<div class="rounded-2xl border border-border bg-card">
		<div class="flex items-center justify-between border-b border-border px-4 py-2.5">
			<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
				{$t('announcements.targetsLabel')} ({live.targets.length})
			</p>
			{#if isDraft}
				<PermissionGate
					permission="COMMUNICATION_CREATE"
					mode="disable"
					tooltip={$t('announcements.permissionCreate')}
				>
					{#snippet children({ disabled, title })}
						<Button
							size="sm"
							variant="outline"
							class="h-7 rounded-full text-xs"
							{disabled}
							{title}
							onclick={() => modals.open('add-target')}
						>
							{$t('announcements.addTarget')}
						</Button>
					{/snippet}
				</PermissionGate>
			{/if}
		</div>
		{#if live.targets.length === 0}
			<p class="px-4 py-6 text-center text-sm text-muted-foreground">
				{$t('announcements.noTargets')}
			</p>
		{:else}
			<ul class="divide-y divide-border">
				{#each live.targets as target (target.id)}
					<li class="px-4 py-2.5 text-sm text-foreground/80">
						{targetLabel(target)}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<AnnouncementTargetFormModal announcementId={live.id} bind:open={addTargetOpen.open} />

<FormModal
	bind:open={publishOpen}
	title={$t('announcements.publishTitle')}
	description={$t('announcements.publishDescription', { title: live.title })}
	submitLabel={$t('announcements.publish')}
	submitDisabled={live.targets.length === 0}
	onSubmit={confirmPublish}
/>

<ConfirmModal
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('announcements.deleteConfirm', { title: live.title })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
