<script lang="ts">
	import type { Announcement } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { publishAnnouncementMutation } from '$lib/api/mutations/announcement.mutations';
	import { deleteAnnouncementMutation } from '$lib/api/mutations/delete-entity.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import DeleteEntityButton from '$lib/components/ui/DeleteEntityButton.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import DrawerEntityHeader from '../shared/DrawerEntityHeader.svelte';
	import { resolveAnnouncementTargetLabel } from './announcement-target-label';
	import AnnouncementFormModal from './AnnouncementFormModal.svelte';
	import AnnouncementTargetFormModal from './AnnouncementTargetFormModal.svelte';

	const { announcement }: { announcement: Announcement } = $props();

	const live = $derived(
		detailDataContext.announcements.find(entry => entry.id === announcement.id) ?? announcement,
	);
	const isDraft = $derived(live.status === 'draft');

	let addTargetOpen = $state(false);
	let publishOpen = $state(false);

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
			detail: detailDataContext,
			labelForKind: kind => get(t)(`announcements.targetKind.${kind}`),
		});
	}

	function confirmPublish() {
		publishOpen = false;
		void publishAnnouncementMutation({
			announcementId: live.id,
			successMessage: get(t)('announcements.publishSuccess', { title: live.title }),
		});
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
				<AnnouncementFormModal announcement={live} />
				<PermissionGate
					permission="COMMUNICATION_CREATE"
					mode="disable"
					tooltip={$t('announcements.permissionCreate')}
				>
					{#snippet children({ disabled, title })}
						<Button
							size="sm"
							variant="outline"
							class="rounded-full"
							{disabled}
							{title}
							onclick={() => (addTargetOpen = true)}
						>
							{$t('announcements.addTarget')}
						</Button>
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
				<PermissionGate
					permission="COMMUNICATION_CREATE"
					mode="disable"
					tooltip={$t('announcements.permissionCreate')}
				>
					{#snippet children({ disabled, title })}
						<DeleteEntityButton
							{disabled}
							{title}
							confirmTitle={$t('common.deleteConfirmTitle')}
							confirmDescription={$t('announcements.deleteConfirm', { title: live.title })}
							onConfirm={() => deleteAnnouncementMutation(live.id, {
								successMessage: get(t)('announcements.toastDeleted', { title: live.title }),
							})}
						/>
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
							onclick={() => (addTargetOpen = true)}
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

<AnnouncementTargetFormModal announcementId={live.id} bind:open={addTargetOpen} />

<FormModal
	bind:open={publishOpen}
	title={$t('announcements.publishTitle')}
	description={$t('announcements.publishDescription', { title: live.title })}
	submitLabel={$t('announcements.publish')}
	submitDisabled={live.targets.length === 0}
	onSubmit={confirmPublish}
/>
