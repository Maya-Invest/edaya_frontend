<script lang="ts">
	import type { StaffMember } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { PERMISSION_CATALOG } from '$lib/api/access-roles-data';
	import Label from '$lib/components/ui/label/label.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { ShieldCheck } from '$lib/icons';
	import { cn } from '$lib/utils';
	import {
		STAFF_SCOPE_LABEL,
		STAFF_SCOPE_TONE,
	} from '../shared/drawer-constants.ts';

	const { s }: { s: StaffMember } = $props();

	const role = $derived(s.role);
	const enabledMap = $derived(detailDataContext.roleEnabledPermissions[role] ?? {});

	const classLabels = $derived(
		s.classes.map(id => academicContext.classes.find(c => c.id === id)?.name ?? id),
	);

	const grouped = $derived.by(() => {
		const acc: Record<string, typeof PERMISSION_CATALOG> = {};
		PERMISSION_CATALOG.filter(permission => enabledMap[permission.key]).forEach((permission) => {
			(acc[permission.category] ||= []).push(permission);
		});
		return acc;
	});
</script>

<div class="space-y-3">
	<div class="flex items-center gap-2">
		<ShieldCheck class="h-4 w-4 text-muted-foreground" />
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('staff.permissionsTitle', { role: $t(`staff.role.${role}`) })}
		</Label>
	</div>
	<p class="text-[11px] text-muted-foreground">
		{$t('staff.permissionsHint')}
	</p>
	{#each Object.entries(grouped) as [cat, rows] (cat)}
		<div class="overflow-hidden rounded-xl border border-border bg-card">
			<div
				class="bg-secondary/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
			>
				{cat}
			</div>
			<ul class="divide-y divide-border/60">
				{#each rows as p (p.key)}
					<li class="px-3 py-2.5">
						<div class="text-sm font-medium">{p.label}</div>
						<div class="text-xs text-muted-foreground">{p.description}</div>
						<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
							<span class="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70">
								{$t('staff.scopeLabel')}
							</span>
							{#each p.scopes as scope (scope)}
								{#if scope === 'global'}
									<span
										class={cn(
											'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
											STAFF_SCOPE_TONE[scope],
										)}
									>
										{STAFF_SCOPE_LABEL[scope]}
									</span>
								{:else if scope === 'class'}
									{#each classLabels as label (label)}
										<span
											class="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground/80"
										>
											{label}
										</span>
									{/each}
									{#if classLabels.length === 0}
										<span class="text-[10px] text-muted-foreground">—</span>
									{/if}
								{:else}
									{#each s.subjectLabels ?? [] as label (label)}
										<span
											class="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground/80"
										>
											{label}
										</span>
									{/each}
									{#if !s.subjectLabels?.length}
										<span class="text-[10px] text-muted-foreground">—</span>
									{/if}
								{/if}
							{/each}
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</div>
