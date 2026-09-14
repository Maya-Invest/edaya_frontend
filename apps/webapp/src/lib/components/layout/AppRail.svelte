<script lang="ts">
	import { page } from '$app/stores';
	import { resolveActiveClassId } from '$lib/academic/class-selection';
	import { academicContext } from '$lib/academic/context.svelte';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';
	import { t } from '$lib/i18n';
	import { MODULES, DASHBOARD_HREF, classItemHref, getModuleFromPath } from '$lib/navigation';
	import { cn } from '$lib/utils';

	const activeModule = $derived(getModuleFromPath($page.url.pathname));
	const classId = $derived(resolveActiveClassId($page.params.classId, academicContext.classes));

	function moduleHref(key: (typeof MODULES)[number]['key']): string {
		if (key === 'classes') {
			return classItemHref(classId, 'students');
		}
		return MODULES.find(mod => mod.key === key)?.href ?? DASHBOARD_HREF;
	}
</script>

<aside
	class="flex h-full w-16 shrink-0 flex-col items-center justify-between border-r border-border bg-primary py-5 text-primary-foreground"
>
	<div class="flex flex-col items-center gap-2">
		<BrandLogo variant="symbol" tone="white" />
		{#each MODULES as m (m.key)}
			{@const active = activeModule === m.key}
			{@const Icon = m.icon}
			<a
				href={moduleHref(m.key)}
				title={$t(m.tKey)}
				class={cn(
					'group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all',
					active
						? 'bg-primary-foreground/10 text-primary-foreground'
						: 'text-primary-foreground/85 hover:bg-primary-foreground/5 hover:text-primary-foreground',
				)}
			>
				<Icon class="h-[18px] w-[18px]" />
				{#if active}
					<span
						class="absolute -left-px top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-r-full bg-primary-foreground"
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
