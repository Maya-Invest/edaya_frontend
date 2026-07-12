<script lang="ts">
	import type { Evaluation } from '$lib/types/school';
	import { page } from '$app/stores';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import { formatLocaleDate } from '$lib/date/format';
	import { locale, t } from '$lib/i18n';
	import { FileText, Paperclip } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';

	const { evaluation }: { evaluation: Evaluation } = $props();

	type EvaluationDetailsModal = 'attach';

	const modals = createUrlSyncedModals<EvaluationDetailsModal>({
		allowed: ['attach'],
		getUrl: () => $page.url,
	});
	$effect(() => {
		modals.hydrate();
	});
	const attachOpen = bindUrlModal(modals, 'attach');

	const isHomework = $derived(evaluation.kind === 'homework');
	const formattedDate = $derived(
		evaluation.date
			? formatLocaleDate(evaluation.date, $locale, {
				day: 'numeric',
				month: 'long',
				year: 'numeric',
			})
			: '-',
	);
</script>

{#if evaluation.description}
	<p class="text-sm text-foreground/70">{evaluation.description}</p>
{/if}

{#if isHomework}
	<div class="grid grid-cols-2 gap-3">
		<DrawerField label={$t('drawer.assigned')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				{evaluation.assignedDate ?? formattedDate}
			</div>
		</DrawerField>
		<DrawerField label={$t('hw.due')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				{evaluation.dueDate ?? formattedDate}
			</div>
		</DrawerField>
	</div>

	<div>
		<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('drawer.attachments')}
		</p>
		<div class="mt-2 space-y-2">
			{#each evaluation.attachments as attachment (attachment.name)}
				<div class="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-card">
						<FileText class="h-4 w-4 text-muted-foreground" />
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm">{attachment.name}</p>
						<p class="font-mono text-[10px] text-muted-foreground">{attachment.size}</p>
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
{:else}
	<div class="grid grid-cols-2 gap-3">
		<div class="rounded-xl bg-primary/10 p-3">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('eval.average')}</p>
			<p class="mt-1 font-display text-xl tabular-nums">
				{evaluation.graded > 0 ? evaluation.averageMark.toFixed(1) : '-'}
				<span class="text-sm text-muted-foreground">/ {evaluation.outOf}</span>
			</p>
		</div>
		<div class="rounded-xl bg-secondary/60 p-3">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('eval.graded')}</p>
			<p class="mt-1 font-display text-xl tabular-nums">{evaluation.graded}/{evaluation.total}</p>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<DrawerField label={$t('eval.date')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				{formattedDate}
			</div>
		</DrawerField>
		<DrawerField label={$t('eval.coefficient')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				x{evaluation.coefficient}
			</div>
		</DrawerField>
	</div>
{/if}

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
