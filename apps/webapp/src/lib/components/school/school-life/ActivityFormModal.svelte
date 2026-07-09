<script lang="ts">
	import type { Activity } from '$lib/types/school';
	import { createActivityMutation, updateActivityMutation } from '$lib/api/mutations/activity.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	const CATEGORIES: Activity['category'][] = ['Sport', 'Arts', 'Science', 'Language', 'Wellbeing'];

	let {
		activity,
		open = $bindable(false),
		onCreated,
		disabled = false,
		title,
	}: {
		activity?: Activity;
		open?: boolean;
		onCreated?: (activityId: string) => void;
		disabled?: boolean;
		title?: string;
	} = $props();

	let busy = $state(false);
	let wasOpen = $state(false);
	let name = $state('');
	let category = $state<Activity['category']>('Sport');
	let coach = $state('');
	let capacity = $state('20');
	let description = $state('');
	let startDate = $state('');
	let endDate = $state('');

	const isEdit = $derived(activity !== undefined);
	const categoryLabel = $derived($t(`activities.cat.${category}`));
	const numericCapacity = $derived(Number.parseInt(capacity, 10));
	const minCapacity = $derived(
		isEdit && activity
			? Math.max(activity.enrollments.length, activity.participants)
			: 1,
	);
	const canSubmit = $derived(
		name.trim().length > 0 && coach.trim().length > 0 && description.trim().length > 0 && startDate.length > 0 && endDate.length > 0 && Number.isFinite(numericCapacity) && numericCapacity >= minCapacity && startDate <= endDate,
	);

	function resetForm() {
		if (activity) {
			name = activity.name;
			category = activity.category;
			coach = activity.coach;
			capacity = String(activity.capacity);
			description = activity.description;
			startDate = activity.startDate.slice(0, 10);
			endDate = activity.endDate.slice(0, 10);
		}
		else {
			name = '';
			category = 'Sport';
			coach = '';
			capacity = '20';
			description = '';
			const today = new Date().toISOString().slice(0, 10);
			startDate = today;
			endDate = today;
		}
	}

	$effect(() => {
		if (open && !wasOpen)
			resetForm();
		wasOpen = open;
	});

	async function submit() {
		if (!canSubmit)
			return;

		busy = true;
		if (activity) {
			const ok = await updateActivityMutation({
				activityId: activity.id,
				name,
				category,
				coach,
				capacity: numericCapacity,
				description,
				startDate,
				endDate,
				successMessage: get(t)('activities.updateSuccess', { name: name.trim() }),
			});
			busy = false;
			if (ok) {
				open = false;
			}
		}
		else {
			const activityId = await createActivityMutation({
				name,
				category,
				coach,
				capacity: numericCapacity,
				description,
				startDate,
				endDate,
				successMessage: get(t)('activities.createSuccess', { name: name.trim() }),
			});
			busy = false;
			if (activityId) {
				open = false;
				resetForm();
				onCreated?.(activityId);
			}
		}
	}
</script>

{#if isEdit}
	<Button
		variant="outline"
		size="sm"
		class="rounded-full"
		{disabled}
		{title}
		onclick={() => (open = true)}
	>
		{$t('common.edit')}
	</Button>
{/if}

<FormModal
	bind:open
	title={isEdit ? $t('activities.editTitle') : $t('activities.createTitle')}
	description={isEdit ? activity?.name : $t('activities.createDescription')}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('activities.name')}
		</Label>
		<Input bind:value={name} />
	</div>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('activities.category')}
			</Label>
			<Select.Root type="single" value={category} onValueChange={v => v && (category = v as Activity['category'])}>
				<Select.Trigger>
					<Select.Value placeholder={$t('activities.category')}>
						{categoryLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each CATEGORIES as entry (entry)}
						<Select.Item value={entry} label={$t(`activities.cat.${entry}`)}>
							{$t(`activities.cat.${entry}`)}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('activities.capacity')}
			</Label>
			<Input type="number" min={minCapacity} step="1" bind:value={capacity} />
		</div>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('activities.coach')}
		</Label>
		<Input bind:value={coach} />
	</div>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('activities.startDate')}
			</Label>
			<Input type="date" bind:value={startDate} />
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('activities.endDate')}
			</Label>
			<Input type="date" bind:value={endDate} />
		</div>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('activities.description')}
		</Label>
		<Textarea bind:value={description} rows={4} />
	</div>
</FormModal>
