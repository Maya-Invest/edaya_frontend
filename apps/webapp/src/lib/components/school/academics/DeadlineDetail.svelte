<script lang="ts">
	import type { Deadline } from '$lib/types/school';
	import { page } from '$app/stores';
	import { deleteHomeworkMutation } from '$lib/api/mutations/delete-entity.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { locale, t } from '$lib/i18n';
	import { Check, Clock, AlertCircle, FileText, Paperclip } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import DrawerEntityHeader from '../shared/DrawerEntityHeader.svelte';
	import DrawerField from '../shared/DrawerField.svelte';
	import DeadlineFormModal from './DeadlineFormModal.svelte';

	const { d }: { d: Deadline } = $props();

	const modals = createUrlSyncedModals({ allowed: ['attach', 'edit'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const attachOpen = bindUrlModal(modals, 'attach');
	const editOpen = bindUrlModal(modals, 'edit');

	let deleteOpen = $state(false);
	let deleteBusy = $state(false);

	const subStatusStyle = {
		submitted: { icon: Check, cls: 'text-accent' },
		late: { icon: Clock, cls: 'text-highlight' },
		missing: { icon: AlertCircle, cls: 'text-muted-foreground' },
	} as const;

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await deleteHomeworkMutation(d.id, {
				successMessage: get(t)('hw.toastDeleted', { title: d.title }),
			});
			if (ok) {
				deleteOpen = false;
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

<div class="space-y-5">
	<DrawerEntityHeader name={d.title} summary={d.description}>
		{#snippet chips()}
			<span
				class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
			>
				{$t(`deadlineType.${d.type}`)}
			</span>
			<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground/80">
				{d.subject}
			</span>
		{/snippet}
		{#snippet actions()}
			<PermissionGate permission="GRADE_INPUT" mode="disable" tooltip={$t('hw.permissionCreate')}>
				{#snippet children({ disabled, title })}
					<Button
						variant="outline"
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => modals.open('edit')}
					>
						{$t('common.edit')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet overflow()}
			<PermissionGate permission="GRADE_INPUT" mode="disable" tooltip={$t('hw.permissionCreate')}>
				{#snippet children({ disabled, title })}
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
		{/snippet}
	</DrawerEntityHeader>

	<div class="grid grid-cols-2 gap-3">
		<DrawerField label={$t('drawer.assigned')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				{d.assignedDate}
			</div>
		</DrawerField>
		<DrawerField label={$t('hw.due')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				{d.dueDate}
			</div>
		</DrawerField>
	</div>

	<div>
		<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('drawer.attachments')}
		</p>
		<div class="mt-2 space-y-2">
			{#each d.attachments as a (a.name)}
				<div class="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-card">
						<FileText class="h-4 w-4 text-muted-foreground" />
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm">{a.name}</p>
						<p class="font-mono text-[10px] text-muted-foreground">{a.size}</p>
					</div>
				</div>
			{/each}
			<Button
				variant="ghost"
				size="sm"
				class="w-full rounded-full border border-dashed border-border"
				onclick={() => (attachOpen.open = true)}
			>
				<Paperclip class="mr-1 h-3 w-3" />
				{$t('drawer.attachFile')}
			</Button>
		</div>
	</div>

	<div>
		<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('drawer.submissions')}
		</p>
		<div class="mt-2 overflow-hidden rounded-xl border border-border">
			{#each d.submissions as sub, i (sub.studentId)}
				{@const st = detailDataContext.students.find(s => s.id === sub.studentId)}
				{#if st}
					{@const meta = subStatusStyle[sub.status]}
					<div class={cn('flex items-center gap-3 px-3 py-2.5', i % 2 && 'bg-secondary/30')}>
						<div
							class="flex h-7 w-7 items-center justify-center rounded-md bg-primary font-display text-[10px] font-semibold text-primary-foreground"
						>
							{st.initials}
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-xs font-medium">{st.name}</p>
							{#if sub.date}
								<p class="font-mono text-[10px] text-muted-foreground">
									{new Date(sub.date).toLocaleDateString($locale, { day: 'numeric', month: 'short' })}
								</p>
							{/if}
						</div>
						<meta.icon class={cn('h-4 w-4', meta.cls)} />
						<span class={cn('font-mono text-[10px] uppercase', meta.cls)}>
							{$t(`submission.${sub.status}`)}
						</span>
					</div>
				{/if}
			{/each}
		</div>
	</div>
</div>

<DeadlineFormModal deadline={d} classId={d.classId} bind:open={editOpen.open} showTrigger={false} />

<FormModal
	bind:open={attachOpen.open}
	title={$t('hw.attachTitle')}
	description={$t('hw.attachDescription')}
	submitLabel={$t('common.close')}
	onSubmit={() => {
		attachOpen.open = false;
	}}
>
	<p class="text-sm text-muted-foreground">{$t('hw.attachStub')}</p>
</FormModal>

<ConfirmModal
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('hw.deleteConfirm', { title: d.title })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
