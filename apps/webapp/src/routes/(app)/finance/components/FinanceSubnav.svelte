<script lang="ts">
	import { FINANCIAL_REPORT_READ_PERMISSION } from '$lib/finance/permissions';
	import { t } from '$lib/i18n';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { hasAnyPermission, hasPermission } from '$lib/permissions';
	import { cn } from '$lib/utils';

	type FinanceTab = 'billing' | 'fees' | 'payment' | 'reconciliation';

	const { active }: { active: FinanceTab } = $props();

	const tabs = $derived.by(() => {
		const items: { key: FinanceTab; href: string }[] = [];
		if (hasAnyPermission(['FINANCIAL_CONFIG_READ', 'PAYMENT_READ'])) {
			items.push({ key: 'billing', href: appPath('/(app)/finance/billing/[[id]]') });
		}
		if (hasPermission('FINANCIAL_CONFIG_READ')) {
			items.push({ key: 'fees', href: appPath('/(app)/finance/fees') });
		}
		if (hasAnyPermission(['PAYMENT_READ', 'FINANCIAL_CONFIG_READ'])) {
			items.push({ key: 'payment', href: appPath('/(app)/finance/payment') });
		}
		if (hasPermission(FINANCIAL_REPORT_READ_PERMISSION)) {
			items.push({ key: 'reconciliation', href: appPath('/(app)/finance/reconciliation') });
		}
		return items;
	});
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
