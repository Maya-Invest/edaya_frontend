<script lang="ts">
	import type { Fee, Student, StudentBilling } from '$lib/types/school';
	import { assignFeeToStudentMutation } from '$lib/api/mutations/billing.mutations';
	import StudentPicker from '$lib/components/school/shared/pickers/StudentPicker.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	let {
		students,
		fees,
		billing = [],
		open = $bindable(false),
		onCreated,
	}: {
		students: Student[];
		fees: Fee[];
		billing?: StudentBilling[];
		open?: boolean;
		onCreated?: (studentFeeId: string) => void;
	} = $props();

	let busy = $state(false);
	let studentId = $state('');
	let feeId = $state('');
	let customAmount = $state('');
	let dueDate = $state('');
	let wasOpen = $state(false);

	const sortedStudents = $derived([...students].sort((a, b) => a.name.localeCompare(b.name, 'fr')));

	function isFeeAssigned(student: string, fee: string) {
		return billing.some(entry => entry.studentId === student && entry.feeId === fee);
	}

	function feesForStudent(student: string) {
		return fees.filter(f => !isFeeAssigned(student, f.id));
	}

	const availableFees = $derived(feesForStudent(studentId));
	const selectedStudent = $derived(sortedStudents.find(entry => entry.id === studentId));
	const selectedFee = $derived(fees.find(entry => entry.id === feeId));
	const selectedFeeLabel = $derived(selectedFee?.name ?? '');

	const defaultAmount = $derived(selectedFee?.amount ?? 0);
	const numericCustomAmount = $derived(customAmount.trim() === '' ? undefined : Number.parseFloat(customAmount));
	const effectiveAmount = $derived(numericCustomAmount ?? defaultAmount);

	const canSubmit = $derived(
		studentId.length > 0 && feeId.length > 0 && availableFees.some(entry => entry.id === feeId) && Number.isFinite(effectiveAmount) && effectiveAmount > 0,
	);

	function firstAvailableFeeFor(student: string) {
		return feesForStudent(student)[0]?.id ?? '';
	}

	function resetForm() {
		const defaultStudentId = sortedStudents[0]?.id ?? '';
		studentId = defaultStudentId;
		feeId = firstAvailableFeeFor(defaultStudentId);
		customAmount = '';
		dueDate = '';
	}

	function handleStudentChange(next: string) {
		studentId = next;
		feeId = firstAvailableFeeFor(next);
	}

	function handleFeeChange(value: string | undefined) {
		if (!value)
			return;
		feeId = value;
	}

	$effect(() => {
		if (open && !wasOpen) {
			resetForm();
		}
		wasOpen = open;
	});

	async function submit() {
		if (!canSubmit || !selectedStudent || !selectedFee)
			return;

		busy = true;
		try {
			const studentFeeId = await assignFeeToStudentMutation({
				studentId,
				feeId,
				expectedAmount: numericCustomAmount,
				dueDate: dueDate.trim() ? new Date(`${dueDate}T12:00:00`).toISOString() : undefined,
				successMessage: get(t)('invoice.createSuccess', { student: selectedStudent.name }),
			});
			if (studentFeeId) {
				open = false;
				onCreated?.(studentFeeId);
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={$t('invoice.createTitle')}
	description={$t('invoice.createDescription')}
	submitLabel={$t('finance.newInvoice')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('events.student')}
		</Label>
		<StudentPicker
			bind:value={studentId}
			students={sortedStudents}
			onValueChange={handleStudentChange}
		/>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('billing.fee')}
		</Label>
		{#if availableFees.length === 0}
			<p class="rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
				{$t('invoice.noFeesAvailable')}
			</p>
		{:else}
			<Select.Root type="single" value={feeId} onValueChange={handleFeeChange}>
				<Select.Trigger>
					<Select.Value placeholder={$t('invoice.selectFee')}>
						{selectedFeeLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each availableFees as fee (fee.id)}
						<Select.Item value={fee.id} label={fee.name}>
							{fee.name}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		{/if}
	</div>
	{#if selectedFee}
		<div class="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm">
			<p class="text-[11px] uppercase tracking-wider text-muted-foreground">{$t('invoice.defaultAmount')}</p>
			<p class="font-display text-xl font-semibold tabular-nums">{defaultAmount.toLocaleString()} FCFA</p>
		</div>
	{/if}
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('invoice.customAmount')}
		</Label>
		<Input type="number" min="0" step="100" bind:value={customAmount} placeholder={String(defaultAmount)} />
		<p class="text-xs text-muted-foreground">{$t('invoice.customAmountHint')}</p>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('billing.due')}
		</Label>
		<Input type="date" bind:value={dueDate} />
		<p class="text-xs text-muted-foreground">{$t('invoice.dueDateHint')}</p>
	</div>
</FormModal>
