<script lang="ts">
	import type { Fee } from '$lib/types/school';
	import { deleteFeeMutation } from '$lib/api/mutations/delete-entity.mutations';
	import DeleteEntityButton from '$lib/components/ui/DeleteEntityButton.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import DrawerActionBar from '../shared/DrawerActionBar.svelte';
	import DrawerField from '../shared/DrawerField.svelte';
	import FeeFormModal from './FeeFormModal.svelte';

	const { f }: { f: Fee } = $props();

	const periodLowerKey = $derived(
		f.period.toLowerCase() === 'year' ? 'year' : f.period.toLowerCase() === 'term' ? 'term' : 'month',
	);

	const usage = $derived(detailDataContext.billing.filter(b => b.feeId === f.id).length);
</script>

<div class="space-y-5">
	<div>
		<span
			class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
		>
			{$t(`feeCat.${f.category}`)}
		</span>
		<h3 class="mt-2 font-display text-2xl font-semibold">{f.name}</h3>
		<p class="mt-1 font-display text-3xl font-semibold tabular-nums">
			{f.amount.toLocaleString()} FCFA
			<span class="text-sm font-normal text-muted-foreground">/ {$t(`feePeriod.${periodLowerKey}`)}</span>
		</p>
	</div>

	<DrawerField label={$t('fee.name')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{f.name}</div>
	</DrawerField>
	<div class="grid grid-cols-2 gap-3">
		<DrawerField label={$t('fee.category')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				{$t(`feeCat.${f.category}`)}
			</div>
		</DrawerField>
		<DrawerField label={$t('fee.period')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				{$t(`feePeriod.${f.period}`)}
			</div>
		</DrawerField>
	</div>
	<DrawerField label={$t('fee.amount')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm tabular-nums">
			{f.amount.toLocaleString()} FCFA
		</div>
	</DrawerField>
	<DrawerField label={$t('finance.appliedTo')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
			{usage}
			{usage !== 1 ? $t('finance.studentsLower') : $t('finance.studentLower')}
		</div>
	</DrawerField>

	<DrawerActionBar>
		<PermissionGate
			permission="FINANCIAL_CONFIG_CONFIGURE"
			mode="disable"
			tooltip={$t('fee.permissionConfigure')}
		>
			{#snippet children({ disabled, title })}
				<FeeFormModal fee={f} {disabled} {title} />
			{/snippet}
		</PermissionGate>
		<PermissionGate
			permission="FINANCIAL_CONFIG_CONFIGURE"
			mode="disable"
			tooltip={$t('fee.permissionConfigure')}
		>
			{#snippet children({ disabled, title })}
				<DeleteEntityButton
					{disabled}
					{title}
					confirmTitle={$t('common.deleteConfirmTitle')}
					confirmDescription={$t('fee.deleteConfirm', { name: f.name })}
					onConfirm={() => deleteFeeMutation(f.id, {
						successMessage: get(t)('fee.toastDeleted', { name: f.name }),
					})}
				/>
			{/snippet}
		</PermissionGate>
	</DrawerActionBar>
</div>
