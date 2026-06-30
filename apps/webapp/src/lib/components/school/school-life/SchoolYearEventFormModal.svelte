<script lang="ts">
	import type { SchoolYearEvent } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import {
		createCalendarEventMutation,
		updateCalendarEventMutation,
	} from '$lib/api/mutations/calendar.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	const EVENT_TYPES: SchoolYearEvent['type'][] = ['holiday', 'vacation', 'closure', 'ceremony'];

	let {
		event,
		open = $bindable(false),
		onCreated,
		disabled = false,
		title,
	}: {
		event?: SchoolYearEvent;
		open?: boolean;
		onCreated?: (eventId: string) => void;
		disabled?: boolean;
		title?: string;
	} = $props();

	let busy = $state(false);
	let eventTitle = $state('');
	let description = $state('');
	let date = $state('');
	let endDate = $state('');
	let type = $state<SchoolYearEvent['type']>('holiday');
	let scoped = $state(false);
	let selectedClasses = $state<string[]>([]);

	const isEdit = $derived(event !== undefined);
	const canSubmit = $derived(
		eventTitle.trim().length > 0 && date.trim().length > 0 && (!scoped || selectedClasses.length > 0),
	);

	function resetForm() {
		if (event) {
			eventTitle = event.title;
			description = event.description;
			date = event.date;
			endDate = event.endDate ?? event.date;
			type = event.type;
			scoped = event.scope !== 'all';
			selectedClasses = event.scope === 'all' ? [] : [...event.scope];
		}
		else {
			eventTitle = '';
			description = '';
			date = '';
			endDate = '';
			type = 'holiday';
			scoped = false;
			selectedClasses = [];
		}
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	function toggleClass(id: string) {
		selectedClasses = selectedClasses.includes(id)
			? selectedClasses.filter(c => c !== id)
			: [...selectedClasses, id];
	}

	function scopeValue(): SchoolYearEvent['scope'] {
		if (!scoped) {
			return 'all';
		}
		return selectedClasses;
	}

	async function submit() {
		if (!canSubmit) {
			return;
		}

		busy = true;
		try {
			if (event) {
				const ok = await updateCalendarEventMutation({
					eventId: event.id,
					linkedIds: event.linkedIds,
					title: eventTitle,
					description,
					date,
					endDate: endDate || date,
					type,
					scope: scopeValue(),
					successMessage: get(t)('calendar.updateSuccess', { title: eventTitle.trim() }),
				});
				if (ok) {
					open = false;
				}
			}
			else {
				const eventId = await createCalendarEventMutation({
					title: eventTitle,
					description,
					date,
					endDate: endDate || date,
					type,
					scope: scopeValue(),
					successMessage: get(t)('calendar.createSuccess', { title: eventTitle.trim() }),
				});
				if (eventId) {
					open = false;
					resetForm();
					onCreated?.(eventId);
				}
			}
		}
		finally {
			busy = false;
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
	title={isEdit ? $t('calendar.editTitle') : $t('calendar.createTitle')}
	description={isEdit ? event?.title : $t('calendar.createDescription')}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('drawer.title')}
		</Label>
		<Input bind:value={eventTitle} />
	</div>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('drawer.start')}
			</Label>
			<Input type="date" bind:value={date} />
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('drawer.end')}
			</Label>
			<Input type="date" bind:value={endDate} />
		</div>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('cal.typeLabel')}
		</Label>
		<Select.Root type="single" value={type} onValueChange={v => v && (type = v as SchoolYearEvent['type'])}>
			<Select.Trigger>
				<Select.Value>
					{$t(`calType.${type}`)}
				</Select.Value>
			</Select.Trigger>
			<Select.Content>
				{#each EVENT_TYPES as eventType (eventType)}
					<Select.Item value={eventType} label={$t(`calType.${eventType}`)}>
						{$t(`calType.${eventType}`)}
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<div class="space-y-3 rounded-xl border border-border bg-secondary/30 p-3">
		<label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
			<Checkbox checked={scoped} onCheckedChange={v => (scoped = v === true)} />
			{$t('calendar.scopedLabel')}
		</label>
		<p class="text-xs text-muted-foreground">
			{scoped ? $t('calendar.scopedHint') : $t('calendar.allClassesHint')}
		</p>
		{#if scoped}
			<div class="grid grid-cols-2 gap-2 pt-1">
				{#each academicContext.classes as c (c.id)}
					<label
						class="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs"
					>
						<Checkbox
							checked={selectedClasses.includes(c.id)}
							onCheckedChange={() => toggleClass(c.id)}
						/>
						<span class="font-medium">{c.name}</span>
						<span class="text-muted-foreground">· {c.level}</span>
					</label>
				{/each}
			</div>
		{/if}
	</div>

	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('drawer.notes')}
		</Label>
		<Textarea bind:value={description} rows={4} />
	</div>
</FormModal>
