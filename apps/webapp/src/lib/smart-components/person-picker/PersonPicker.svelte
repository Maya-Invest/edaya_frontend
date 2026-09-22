<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { PersonPickerItem } from './person-picker-types';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { t } from '$lib/i18n';
	import { Check, ChevronDown, Search } from '$lib/icons';
	import { cn } from '$lib/utils';
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
	let searchInput: HTMLInputElement | undefined = $state();

	const selected = $derived(items.find(entry => entry.id === value));
	const filtered = $derived(filterPersonPickerItems(items, query));

	function selectItem(id: string) {
		value = id;
		onValueChange?.(id);
		open = false;
		query = '';
	}

	function handleOpenChange(next: boolean) {
		open = next;
		if (next) {
			queueMicrotask(() => searchInput?.focus());
		}
		else {
			query = '';
		}
	}
</script>

<Popover.Root {open} onOpenChange={handleOpenChange}>
	<Popover.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				{disabled}
				data-testid="person-picker-trigger"
				class={cn(
					'control-focus flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50',
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
					<span class="min-w-0 flex-1 truncate">
						<span class="font-medium">{selected.name}</span>
						{#if selected.subtitle}
							<span class="ml-1 text-muted-foreground">· {selected.subtitle}</span>
						{/if}
					</span>
				{:else}
					<span class="flex-1 truncate text-muted-foreground">
						{placeholder ?? $t('picker.selectPerson')}
					</span>
				{/if}
				<ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
			</button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content align="start" class="w-[min(24rem,calc(100vw-2rem))] p-0">
		<div class="border-b border-border p-2">
			{#if filters}
				<div class="mb-2">
					{@render filters()}
				</div>
			{/if}
			<div class="relative">
				<Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
				<input
					bind:this={searchInput}
					bind:value={query}
					placeholder={searchPlaceholder ?? $t('common.search')}
					class="control-focus flex h-9 w-full rounded-lg border border-input bg-background py-2 pl-8 pr-3 text-sm placeholder:text-muted-foreground"
				/>
			</div>
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
								'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-50',
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
								<span class="block truncate font-medium">{item.name}</span>
								{#if item.subtitle}
									<span class="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
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
</Popover.Root>
