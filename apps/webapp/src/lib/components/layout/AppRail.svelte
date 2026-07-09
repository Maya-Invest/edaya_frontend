<script lang="ts">
	import { page } from '$app/stores';
	import { t } from '$lib/i18n';
	import { GraduationCap } from '$lib/icons';
	import { MODULES, getModuleFromPath } from '$lib/navigation';
	import { cn } from '$lib/utils';

	const activeModule = $derived(getModuleFromPath($page.url.pathname));
</script>

<aside
	class="flex h-full w-16 shrink-0 flex-col items-center justify-between border-r border-border bg-primary py-5 text-primary-foreground"
>
	<div class="flex flex-col items-center gap-2">
		<div
			class="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft"
		>
			<GraduationCap class="h-5 w-5" />
		</div>
		{#each MODULES as m (m.key)}
			{@const active = activeModule === m.key}
			{@const Icon = m.icon}
			<a
				href={m.href}
				title={$t(m.tKey)}
				class={cn(
					'group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all',
					active
						? 'bg-primary-foreground/10 text-accent'
						: 'text-primary-foreground/55 hover:bg-primary-foreground/5 hover:text-primary-foreground',
				)}
			>
				<Icon class="h-[18px] w-[18px]" />
				{#if active}
					<span
						class="absolute -left-px top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-r-full bg-accent"
					></span>
				{/if}
				<span
					class="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md bg-primary-foreground px-2 py-1 text-[11px] font-medium text-primary opacity-0 shadow-soft transition-opacity group-hover:opacity-100"
				>
					{$t(m.tKey)}
				</span>
			</a>
		{/each}
	</div>
</aside>
