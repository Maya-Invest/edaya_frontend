<script lang="ts">
	import type { FeedbackPicker } from '$lib/api/family-feedback-types';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { onDestroy } from 'svelte';
	import { getFamilyFeedbackPageState } from '../family-feedback-page.svelte';
	import { FeedbackPickerState } from '../lib/feedback-picker.svelte';

	let { picker, label, fallback, value = $bindable('') }: {
		picker: FeedbackPicker;
		label: string;
		fallback?: string;
		value?: string;
	} = $props();
	const feedback = getFamilyFeedbackPageState();
	const options = new FeedbackPickerState(feedback, () => picker);
	const selectedLabel = $derived(feedback.findOption(picker, value)?.label ?? fallback ?? label);
	onDestroy(() => options.cancel());
</script>

<div class="space-y-1.5" data-feedback-picker={picker}>
	<Label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
	{#if options.searchable}
		<Input type="search" maxlength={200} aria-label={`${label} · ${$t('common.search')}`} placeholder={$t('common.search')} value={options.query} oninput={event => options.search(event.currentTarget.value)} />
	{/if}
	<Select.Root type="single" {value} onValueChange={(id) => {
		const choice = options.items.find(item => item.id === id);
		if (choice) {
			feedback.chooseOption(picker, choice);
			value = choice.id;
		}
	}}>
		<Select.Trigger aria-label={label} disabled={options.status !== 'ready'}>
			<Select.Value placeholder={label}>{selectedLabel}</Select.Value>
		</Select.Trigger>
		<Select.Content class="z-[100]">
			{#each options.items as item (item.id)}
				<Select.Item value={item.id} label={item.label}>{item.label}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
	{#if options.status !== 'ready'}
		<DataState compact status={options.status} onRetry={() => void options.retry()} />
	{:else if options.query && !options.items.length}
		<p class="text-sm text-muted-foreground" role="status">{$t('dataState.noMatch')}</p>
	{:else if options.cursor}
		<Button type="button" variant="outline" size="sm" onclick={() => void options.more()}>{$t('familyFeedback.moreOptions')}</Button>
	{/if}
</div>
