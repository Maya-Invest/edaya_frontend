<script lang="ts">
	import type { FeedbackOption, FeedbackPicker } from '$lib/api/family-feedback-types';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { onDestroy } from 'svelte';
	import { getFamilyFeedbackPageState } from '../family-feedback-page.svelte';

	let { picker, label, fallback, value = $bindable('') }: {
		picker: FeedbackPicker;
		label: string;
		fallback?: string;
		value?: string;
	} = $props();
	const feedback = getFamilyFeedbackPageState();
	const cursorKey = $derived(picker === 'assignments' ? 'nextAssignment' : 'nextModerator');
	let query = $state('');
	let result = $state<{ items: FeedbackOption[]; cursor: string | null }>();
	let status = $state<'ready' | 'loading' | 'error'>('ready');
	let retryAfter: string | undefined;
	let request: AbortController | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;
	const items = $derived(result?.items ?? feedback.firstOptions?.[picker] ?? []);
	const cursor = $derived(result ? result.cursor : feedback.firstOptions?.[cursorKey]);
	const selectedLabel = $derived(feedback.findOption(picker, value)?.label ?? fallback ?? label);

	function cancel() {
		clearTimeout(timer);
		request?.abort();
	}
	onDestroy(cancel);

	async function fetchPage(after: string | undefined = undefined) {
		cancel();
		const controller = new AbortController();
		request = controller;
		const scope = feedback.optionScope;
		const previous = after ? items : [];
		status = 'loading';
		retryAfter = after;
		try {
			const page = await feedback.readOptions(picker, controller.signal, query.trim() || undefined, after);
			if (controller.signal.aborted || scope !== feedback.optionScope)
				return;
			result = { items: [...previous, ...page[picker]], cursor: page[cursorKey] };
			status = 'ready';
		}
		catch (error) {
			if (!controller.signal.aborted && scope === feedback.optionScope && !feedback.handleOptionsDenial(error))
				status = 'error';
		}
	}

	function search(text: string) {
		cancel();
		query = text;
		status = 'loading';
		timer = setTimeout(() => void fetchPage(), 200);
	}
</script>

<div class="space-y-1.5" data-feedback-picker={picker}>
	<Label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
	{#if feedback.firstOptions?.[cursorKey]}
		<Input type="search" maxlength={200} aria-label={`${label} · ${$t('common.search')}`} placeholder={$t('common.search')} value={query} oninput={event => search(event.currentTarget.value)} />
	{/if}
	<Select.Root type="single" {value} onValueChange={(id) => {
		const choice = items.find(item => item.id === id);
		if (choice) {
			feedback.chooseOption(picker, choice);
			value = choice.id;
		}
	}}>
		<Select.Trigger aria-label={label} disabled={status !== 'ready'}>
			<Select.Value placeholder={label}>{selectedLabel}</Select.Value>
		</Select.Trigger>
		<Select.Content class="z-[100]">
			{#each items as item (item.id)}
				<Select.Item value={item.id} label={item.label}>{item.label}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
	{#if status !== 'ready'}
		<DataState compact {status} onRetry={() => void fetchPage(retryAfter)} />
	{:else if query && !items.length}
		<p class="text-sm text-muted-foreground" role="status">{$t('dataState.noMatch')}</p>
	{:else if cursor}
		<Button type="button" variant="outline" size="sm" onclick={() => void fetchPage(cursor ?? undefined)}>{$t('familyFeedback.moreOptions')}</Button>
	{/if}
</div>
