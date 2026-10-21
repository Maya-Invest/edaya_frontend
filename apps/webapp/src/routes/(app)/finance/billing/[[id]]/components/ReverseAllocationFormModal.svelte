<script lang="ts">
	import type { PaymentSettlementHistory } from '$lib/api/finance-types';
	import type { StudentBilling } from '$lib/types/school';

	import { activeSettleAllocations } from '$lib/api/finance-types';

	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { formatMinorUnits } from '$lib/finance/money';
	import { locale, t } from '$lib/i18n';
	import { hasPermission } from '$lib/permissions';
	import { get } from 'svelte/store';
	import { getBillingPageState } from '../../billing-page.svelte';

	let {
		billing,
		open = $bindable(false),
	}: {
		billing: StudentBilling;
		open?: boolean;
	} = $props();

	const billingPage = getBillingPageState();
	const account = $derived(billingPage.accountForStudent(billing.studentId));
	const currency = $derived(billing.currency);

	let busy = $state(false);
	let allocationId = $state('');
	let history = $state<PaymentSettlementHistory | null>(null);
	let wasOpen = $state(false);

	const allocations = $derived(activeSettleAllocations([...(history?.allocations ?? [])], billing.id));
	const selectedAllocation = $derived(allocations.find(row => row.id === allocationId));
	const canSubmit = $derived(Boolean(selectedAllocation));

	function allocationLabel(row: PaymentSettlementHistory['allocations'][number]): string {
		const amount = formatMinorUnits(row.amount, currency, $locale);
		const recorded = new Date(row.recordedAt).toLocaleDateString($locale, {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
		return `${amount} · ${recorded}`;
	}

	const selectedAllocationLabel = $derived(
		selectedAllocation ? allocationLabel(selectedAllocation) : '',
	);

	function resetForm() {
		allocationId = '';
		history = null;
	}

	async function loadHistory() {
		const accountId = account?.id;
		if (!accountId) {
			history = null;
			return;
		}
		history = await billingPage.loadSettlementHistory({ accountId });
		allocationId = activeSettleAllocations(history?.allocations ?? [], billing.id)[0]?.id ?? '';
	}

	$effect(() => {
		if (open && !wasOpen) {
			resetForm();
			void loadHistory();
		}
		wasOpen = open;
	});

	async function submit() {
		if (busy || !hasPermission('PAYMENT_ALLOCATE', { studentId: billing.studentId, classId: billing.classId }) || billing.paid <= 0)
			return;
		if (!canSubmit || !selectedAllocation) {
			return;
		}
		busy = true;
		try {
			const ok = await billingPage.performReverseAllocation({
				allocationId: selectedAllocation.id,
				successMessage: get(t)('billing.unallocateSuccess'),
			});
			if (ok) {
				open = false;
				await billingPage.refreshSlice();
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={$t('billing.unallocateTitle')}
	description={$t('billing.unallocateDescription')}
	submitLabel={$t('billing.unallocate')}
	cancelLabel={$t('common.cancel')}
	{busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('billing.unallocateSelect')}
		</Label>
		{#if allocations.length === 0}
			<p class="rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
				{$t('billing.unallocateEmpty')}
			</p>
		{:else}
			<Select.Root type="single" value={allocationId} onValueChange={value => value && (allocationId = value)}>
				<Select.Trigger>
					<Select.Value placeholder={$t('billing.unallocateSelect')}>
						{selectedAllocationLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content>
					{#each allocations as row (row.id)}
						<Select.Item value={row.id} label={allocationLabel(row)}>
							{allocationLabel(row)}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		{/if}
	</div>
</FormModal>
