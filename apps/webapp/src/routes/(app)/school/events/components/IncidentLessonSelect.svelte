<script lang="ts">
	import type { EventsPageState } from '../events-page.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import { t } from '$lib/i18n';
	import { ApiError } from '@maya-invest/edaya-api-client';
	import { onDestroy, onMount } from 'svelte';
	import { getEventsPageState } from '../events-page.svelte';

	type Option = Awaited<ReturnType<EventsPageState['loadIncidentLessons']>>['items'][number];
	let { classGroupId, value = $bindable('') }: { classGroupId?: string; value?: string } = $props();
	const events = getEventsPageState();
	let query = $state('');
	let items = $state.raw<Option[]>([]);
	let selected = $state<Option | null>(null);
	let cursor = $state<string | null>(null);
	let showSearch = $state(false);
	let status = $state<'loading' | 'ready' | 'error'>('ready');
	let retryCursor: string | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let request: AbortController | undefined;

	function cancel() {
		clearTimeout(timer);
		request?.abort();
	}

	async function load(after: string | undefined = undefined) {
		cancel();
		if (!classGroupId)
			return;
		const controller = new AbortController();
		request = controller;
		status = 'loading';
		retryCursor = after;
		try {
			const result = await events.loadIncidentLessons({ classGroupId, q: query.trim() || undefined, cursor: after, selectedId: after ? undefined : value || undefined }, controller.signal);
			if (controller.signal.aborted)
				return;
			items = after ? [...items, ...result.items] : result.items;
			if (!after) {
				selected = result.selected;
				if (!query)
					showSearch = Boolean(result.nextCursor);
			}
			cursor = result.nextCursor;
			status = 'ready';
		}
		catch (error) {
			if (controller.signal.aborted)
				return;
			if (error instanceof ApiError && [400, 401, 403].includes(error.status)) {
				items = [];
				selected = null;
				cursor = null;
				retryCursor = undefined;
				if (after && error.status === 400) {
					await load();
					return;
				}
			}
			status = 'error';
		}
	}

	function search(text: string) {
		cancel();
		query = text;
		items = [];
		cursor = null;
		status = 'loading';
		timer = setTimeout(() => void load(), 200);
	}

	function optionLabel(option: Option) {
		return `${option.displayLabel || $t('profile.lessonOccurrence')} · ${option.startsAt}`;
	}

	onMount(() => {
		void load();
	});
	onDestroy(cancel);
</script>

<div class="space-y-2" data-incident-lesson-picker>
	{#if showSearch}
		<Input type="search" maxlength={200} aria-label={`${$t('profile.lessonOccurrence')} · ${$t('common.search')}`} placeholder={$t('common.search')} value={query} oninput={event => search(event.currentTarget.value)} />
	{/if}
	<Label class="block space-y-2">
		<span>{$t('profile.lessonOccurrence')}</span>
		<SelectField class="w-full border bg-card" bind:value disabled={!classGroupId || status !== 'ready'} onchange={() => selected = items.find(row => row.id === value) ?? (selected?.id === value ? selected : null)}>
			<option value="">{$t('profile.notProvided')}</option>
			{#if value && !items.some(row => row.id === value)}
				<option {value}>{selected?.id === value ? optionLabel(selected) : $t('profile.restricted')}</option>
			{/if}
			{#each items as row (row.id)}
				<option value={row.id}>{optionLabel(row)}</option>
			{/each}
		</SelectField>
	</Label>
	{#if status === 'loading'}
		<p role="status">{$t('dataState.loading')}</p>
	{:else if status === 'error'}
		<p role="alert">{$t('dataState.error')}</p>
		<Button variant="outline" onclick={() => load(retryCursor)}>{$t('dataState.retry')}</Button>
	{:else if cursor}
		<Button variant="outline" onclick={() => load(cursor ?? undefined)}>{$t('list.nextPage')}</Button>
	{/if}
</div>
