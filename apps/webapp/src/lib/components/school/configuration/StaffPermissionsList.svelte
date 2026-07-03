<script lang="ts">
	import type { StaffMember } from '$lib/types/school';
	import { formatPermissionLabel } from '$lib/api/staff-permission-assignments-data';
	import Label from '$lib/components/ui/label/label.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { ShieldCheck } from '$lib/icons';
	import { cn } from '$lib/utils';

	const { s }: { s: StaffMember } = $props();

	const rows = $derived(detailDataContext.assignmentsForStaff(s.id));
</script>

<div class="space-y-3">
	<div class="flex items-center gap-2">
		<ShieldCheck class="h-4 w-4 text-muted-foreground" />
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('staff.permissionsTitle', { role: $t(`staff.role.${s.role}`) })}
		</Label>
	</div>
	<p class="text-[11px] text-muted-foreground">
		{$t('staff.permissionsHint')}
	</p>
	{#if rows.length === 0}
		<p class="text-sm text-muted-foreground">{$t('roles.noPermissionsForStaff')}</p>
	{:else}
		<ul class="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
			{#each rows as row (row.id)}
				<li class="px-3 py-2.5">
					<div class="flex items-start justify-between gap-2">
						<div class="min-w-0">
							<div class="text-sm font-medium">{formatPermissionLabel(row.permission, $t)}</div>
							<div class="text-xs text-muted-foreground">{row.scopeLabel}</div>
						</div>
						{#if row.isSynced}
							<span
								class={cn(
									'inline-flex shrink-0 items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground',
								)}
							>
								{$t('roles.syncedBadge')}
							</span>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
