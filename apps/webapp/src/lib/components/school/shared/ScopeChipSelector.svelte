<script lang="ts">
	import type { StaffPermScope } from './drawer-constants.ts';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Popover from '$lib/components/ui/popover';
	import { t } from '$lib/i18n';
	import { ChevronDown } from '$lib/icons';
	import { cn } from '$lib/utils';
	import {
		STAFF_SCOPE_LABEL_KEY,
		STAFF_SCOPE_TONE,
	} from './drawer-constants.ts';

	const {
		type,
		items,
		selected,
		onChange,
	}: {
		type: StaffPermScope;
		items: { id: string; label: string; hint?: string }[];
		selected: string[];
		onChange: (next: string[]) => void;
	} = $props();

	const all = $derived(selected.length === items.length);
	const none = $derived(selected.length === 0);
	const summary = $derived(all ? $t('staff.scope.all') : none ? $t('staff.scope.none') : `${selected.length} sél.`);

	function toggle(id: string) {
		onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
	}
</script>

<Popover.Root>
	<Popover.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				class={cn(
					'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium transition hover:brightness-95',
					STAFF_SCOPE_TONE[type],
				)}
			>
				<span>{$t(STAFF_SCOPE_LABEL_KEY[type])}</span>
				<span class="font-mono opacity-80">· {summary}</span>
				<ChevronDown class="h-3 w-3 opacity-70" />
			</button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content align="start" class="w-72 p-0">
		<div class="flex items-center justify-between border-b border-border px-3 py-2">
			<p class="text-xs font-semibold">{type === 'class' ? $t('staff.scope.classes') : $t('staff.scope.subjects')}</p>
			<div class="flex items-center gap-1 text-[10px]">
				<button
					onclick={() => onChange(items.map(i => i.id))}
					class="rounded-full px-2 py-0.5 text-muted-foreground hover:bg-secondary"
				>
					{$t('staff.scope.selectAll')}
				</button>
				<button
					onclick={() => onChange([])}
					class="rounded-full px-2 py-0.5 text-muted-foreground hover:bg-secondary"
				>
					{$t('staff.scope.selectNone')}
				</button>
			</div>
		</div>
		<ul class="max-h-64 overflow-y-auto py-1">
			{#each items as it (it.id)}
				{@const on = selected.includes(it.id)}
				<li>
					<button
						type="button"
						onclick={() => toggle(it.id)}
						class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-secondary/60"
					>
						<Checkbox checked={on} class="pointer-events-none h-3.5 w-3.5" />
						<span class="flex-1 truncate">{it.label}</span>
						{#if it.hint}
							<span class="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
								{it.hint}
							</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	</Popover.Content>
</Popover.Root>
