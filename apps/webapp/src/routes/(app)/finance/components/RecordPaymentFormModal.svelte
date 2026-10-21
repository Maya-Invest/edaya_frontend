<script lang="ts">
	import type { PaymentMethod, AllocationMode } from '$lib/api/finance-types';
	import type { FinancePaymentDraft } from '$lib/finance/payment-draft.svelte';
	import type { StudentBilling } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { formatMinorUnits } from '$lib/finance/money';
	import { locale, t } from '$lib/i18n';
	import { hasPermission } from '$lib/permissions';
	import StudentPicker from '$lib/smart-components/student-picker/StudentPicker.svelte';
	import { untrack } from 'svelte';

	let { open = $bindable(false), draft, charge, onSuccess }: { open?: boolean; draft: FinancePaymentDraft; charge?: StudentBilling; onSuccess?: () => void | Promise<void> } = $props();
	const formId = $props.id();
	let wasOpen = $state(false);
	let generation = $state(-1);
	$effect(() => {
		if (open && !wasOpen) {
			untrack(() => {
				draft.reset(charge);
				generation = academicContext.scopeGeneration;
			});
		}
		wasOpen = open;
	});
	$effect(() => {
		if (open && generation !== academicContext.scopeGeneration) {
			open = false;
			untrack(() => draft.reset());
		}
	});
	$effect(() => {
		if (open) {
			void draft.studentId;
			untrack(() => void draft.loadStudent());
		}
	});
	async function submit() {
		if (await draft.submit($t('finance.paymentRecorded'))) {
			open = false;
			await onSuccess?.();
		}
	}
</script>
<FormModal bind:open title={$t('payment.recordTitle')} submitLabel={$t('finance.recordPayment')} busy={draft.busy} submitDisabled={!draft.canSubmit} onSubmit={submit}>
	{#if charge}<p class="rounded-xl bg-secondary/40 p-3 text-sm">{charge.studentName ?? charge.studentId} · {charge.label}</p>
	{:else}<Label>{$t('events.student')}</Label><StudentPicker isSelectable={student => hasPermission('PAYMENT_RECORD', { studentId: student.id, classId: student.classId })} bind:value={draft.studentId} active={open} onValueChange={(_id, student) => draft.selectedClassId = student?.classId} />{/if}
	{#if draft.loading}<p role="status" class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>{/if}
	{#if draft.error}<p role="alert" class="text-sm text-destructive">{$t('finance.paymentContextError')}</p><Button variant="outline" onclick={() => draft.loadStudent()}>{$t('dataState.retry')}</Button>{/if}
	<Label for={`${formId}-amount`}>{$t('payment.amount')}</Label><Input id={`${formId}-amount`} type="number" min="0" step="any" bind:value={draft.amount} />
	<Label>{$t('payment.allocationMode')}</Label>
	<FilterSelect aria-label={$t('payment.allocationMode')} bind:value={draft.mode} options={(['targeted', 'account_only', 'fifo'] as AllocationMode[]).map(value => ({ value, label: $t(`payment.allocation.${value}`) }))} />
	{#if draft.mode !== 'account_only' && draft.studentId && !hasPermission('PAYMENT_ALLOCATE', draft.permissionContext)}<p class="text-sm text-muted-foreground">{$t('billing.permissionAllocate')}</p>{/if}
	{#if draft.mode === 'targeted'}
		<div class="space-y-3">
			{#each draft.charges as row (row.id)}
				<div class="rounded-xl border border-border p-3">
					<label class="flex items-center gap-2 text-sm"><input type="checkbox" checked={row.id in draft.targets} onchange={e => draft.toggle(row, e.currentTarget.checked)} />{row.label} · {formatMinorUnits(row.remaining, draft.currency, $locale)}</label>
					{#if row.id in draft.targets}<Input class="mt-2" type="number" min="0" step="any" aria-label={`${$t('finance.applied')} · ${row.label}`} value={draft.targets[row.id]} oninput={e => draft.targets = { ...draft.targets, [row.id]: e.currentTarget.value }} />{/if}
				</div>
			{:else}{#if draft.loadedStudent}<p class="text-sm text-muted-foreground">{$t('finance.depositOnlyHint')}</p>{/if}{/each}
		</div>
	{/if}
	{#if draft.loadedStudent && !draft.loading && !draft.error}
		<div class="space-y-2 rounded-xl border border-border p-3 text-sm">
			<p class="flex justify-between gap-2"><span>{$t('finance.received')}</span><span>{formatMinorUnits(draft.received, draft.currency, $locale)}</span></p>
			<p class="flex justify-between gap-2"><span>{$t('finance.availableCredit')}</span><span>{formatMinorUnits(draft.available, draft.currency, $locale)}</span></p>
			{#each draft.allocations as row (row.chargeId)}<p class="flex justify-between gap-2"><span>{row.label}</span><span>− {formatMinorUnits(row.amount, draft.currency, $locale)}</span></p>{/each}
			<p class="flex justify-between gap-2 font-medium"><span>{$t('finance.resultingCredit')}</span><span>{formatMinorUnits(draft.resultingCredit, draft.currency, $locale)}</span></p>
		</div>
	{/if}
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-2"><Label for={`${formId}-date`}>{$t('payment.date')}</Label><Input id={`${formId}-date`} type="date" bind:value={draft.date} /></div>
		<div class="space-y-2"><Label>{$t('payment.method')}</Label><FilterSelect aria-label={$t('payment.method')} bind:value={draft.method} options={(['cash', 'card', 'bank_transfer', 'mobile_money', 'other'] as PaymentMethod[]).map(value => ({ value, label: $t(`payment.method.${value}`) }))} /></div>
	</div>
	<Label for={`${formId}-reference`}>{$t('payment.reference')}</Label><Input id={`${formId}-reference`} bind:value={draft.reference} />
	<Label for={`${formId}-notes`}>{$t('payment.notes')}</Label><Textarea id={`${formId}-notes`} bind:value={draft.notes} rows={2} />
</FormModal>
