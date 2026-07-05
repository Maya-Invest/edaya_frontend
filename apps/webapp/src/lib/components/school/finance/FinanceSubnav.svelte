<script lang="ts">
	import { t } from '$lib/i18n';
	import { appPath, appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';

	const { active }: { active: 'billing' | 'fees' } = $props();

	const tabs = [
		{ key: 'billing' as const, href: appPath('/(app)/finance/billing/[[id]]') },
		{ key: 'fees' as const, href: appPath('/(app)/finance/fees') },
	];
</script>

<div class="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-soft">
	{#each tabs as tab (tab.key)}
		<button
			type="button"
			onclick={() => {
				if (tab.key !== active) {
					appGoto(tab.href);
				}
			}}
			class={cn(
				'rounded-full px-3.5 py-1.5 text-xs font-medium transition',
				active === tab.key
					? 'bg-primary text-primary-foreground shadow-soft'
					: 'text-muted-foreground hover:text-foreground',
			)}
		>
			{$t(`finance.${tab.key}`)}
		</button>
	{/each}
</div>
