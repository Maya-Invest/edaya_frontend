<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { PersonPickerItem } from './person-picker-types';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { t } from '$lib/i18n';
	import { Check, ChevronDown } from '$lib/icons';
	import { cn } from '$lib/utils';
	import { tick } from 'svelte';
	import { filterPersonPickerItems } from './filter-person-picker-items';

	let {
		value = $bindable(''),
		items,
		placeholder,
		disabled = false,
		searchPlaceholder,
		emptyMessage,
		noResultsMessage,
		class: className,
		filters,
		onValueChange,
	}: {
		value?: string;
		items: PersonPickerItem[];
		placeholder?: string;
		disabled?: boolean;
		searchPlaceholder?: string;
		emptyMessage?: string;
		noResultsMessage?: string;
		class?: string;
		filters?: Snippet;
		onValueChange?: (next: string) => void;
	} = $props();

	let open = $state(false);
	let query = $state('');

	let proxy: HTMLSelectElement;

	const selected = $derived(items.find(entry => entry.id === value));
	const filtered = $derived(filterPersonPickerItems(items, query));

	async function selectItem(id: string) {
		value = id;
		onValueChange?.(id);
		open = false;
		query = '';
		await tick();
		proxy?.dispatchEvent(new Event('change', { bubbles: true }));
	}

	function handleOpenChange(next: boolean) {
		open = next;
		if (next) {
			queueMicrotask(() => document.querySelector<HTMLInputElement>('[data-person-picker-search] input')?.focus());
		}
		else {
			query = '';
		}
	}
</script>

<div class="contents" data-select-field><select hidden tabindex="-1" aria-hidden="true" data-select-value bind:this={proxy} value={value} {disabled} onchange={() => {}}><option value={value}>{value}</option></select>
	<Popover.Root {open} onOpenChange={handleOpenChange}>
		<Popover.Trigger>
			{#snippet child({ props })}
				<button
					{...props}
					type="button"
					{disabled}
					data-testid="person-picker-trigger"
					class={cn(
						'control-focus ui-field ui-select-trigger flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50',
						className,
					)}
				>
					{#if selected}
						<PersonAvatar
							name={selected.name}
							initials={selected.initials}
							photoUrl={selected.photoUrl}
							size="sm"
						/>
						<span class="min-w-0 flex-1 break-words">
							<span class="font-medium">{selected.name}</span>
							{#if selected.subtitle}
								<span class="ml-1 text-muted-foreground">· {selected.subtitle}</span>
							{/if}
						</span>
					{:else}
						<span class="flex-1 break-words text-muted-foreground">
							{placeholder ?? $t('picker.selectPerson')}
						</span>
					{/if}
					<ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
				</button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Content onkeydown={(event) => {
			const root = event.currentTarget;
			const options = Array.from(root.querySelectorAll<HTMLButtonElement>('[role=option]:not(:disabled)'));
			if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !options.length)
				return;
			event.preventDefault();
			const index = options.indexOf(document.activeElement as HTMLButtonElement);
			const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : event.key === 'ArrowDown' ? (index + 1) % options.length : (index + options.length - 1) % options.length;
			options[next]?.focus();
		}} align="start" class="w-[min(24rem,calc(100vw-2rem))] p-0">
			<div class="border-b border-border p-2">
				{#if filters}
					<div class="mb-2">
						{@render filters()}
					</div>
				{/if}
				<div data-person-picker-search><ListSearchField bind:value={query} placeholder={searchPlaceholder ?? $t('common.search')} /></div>
			</div>
			<ul class="max-h-64 overflow-y-auto py-1" role="listbox">
				{#if items.length === 0}
					<li class="px-3 py-6 text-center text-sm text-muted-foreground">
						{emptyMessage ?? $t('picker.noOptions')}
					</li>
				{:else if filtered.length === 0}
					<li class="px-3 py-6 text-center text-sm text-muted-foreground">
						{noResultsMessage ?? $t('picker.noResults')}
					</li>
				{:else}
					{#each filtered as item (item.id)}
						{@const active = item.id === value}
						<li>
							<button
								type="button"
								disabled={item.disabled}
								role="option"
								aria-selected={active}
								onclick={() => selectItem(item.id)}
								class={cn(
									'ui-menu-row control-focus flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-50',
									active && 'bg-primary/10',
								)}
							>
								<PersonAvatar
									name={item.name}
									initials={item.initials}
									photoUrl={item.photoUrl}
									size="list"
								/>
								<span class="min-w-0 flex-1">
									<span class="block break-words font-medium">{item.name}</span>
									{#if item.subtitle}
										<span class="block break-words text-xs text-muted-foreground">{item.subtitle}</span>
									{/if}
								</span>
								{#if item.hint}
									<span class="shrink-0 font-sans tabular-nums text-[10px] uppercase tracking-wider text-muted-foreground">
										{item.hint}
									</span>
								{/if}
								{#if active}
									<Check class="h-4 w-4 shrink-0 text-primary" />
								{/if}
							</button>
						</li>
					{/each}
				{/if}
			</ul>
		</Popover.Content>
	</Popover.Root></div>
