<script lang="ts">
	import type { PeriodDefinition, PeriodDefinitionDayOfWeek } from '$lib/types/school';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { Pencil, Trash2 } from '$lib/icons';
	import { PERIOD_DEFINITION_WEEKDAY_LABEL_KEY } from '../lib/period-definition-presets';

	interface Props {
		groups: Array<{ dayOfWeek: PeriodDefinitionDayOfWeek; defs: PeriodDefinition[] }>;
		onEdit: (def: PeriodDefinition) => void;
		onDelete: (def: PeriodDefinition) => void;
	}

	let { groups, onEdit, onDelete }: Props = $props();
</script>

<div class="mt-3 w-full">
	<div class="grid w-full grid-cols-7 gap-2">
		{#each groups as group (group.dayOfWeek)}
			<section
				class="min-w-0 rounded-2xl border border-border/70 bg-secondary/30"
			>
				<header class="flex items-center justify-between gap-1 px-2 py-2.5 sm:px-3">
					<h4 class="truncate text-xs font-medium text-foreground" title={$t(PERIOD_DEFINITION_WEEKDAY_LABEL_KEY[group.dayOfWeek])}>
						{$t(PERIOD_DEFINITION_WEEKDAY_LABEL_KEY[group.dayOfWeek])}
					</h4>
					<span class="shrink-0 font-mono text-[11px] text-muted-foreground">
						{group.defs.length}
					</span>
				</header>
				{#if group.defs.length === 0}
					<div class="mx-2 mb-2 rounded-xl border border-dashed border-border/60 px-2 py-6 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
						—
					</div>
				{:else}
					<ul class="space-y-2 p-2 pt-0">
						{#each group.defs as def (def.id)}
							<li
								class="rounded-xl border border-border/70 bg-card px-2 py-2 shadow-soft sm:px-3"
							>
								<div class="flex items-start justify-between gap-1">
									<p class="min-w-0 flex-1 text-sm font-medium leading-snug">
										{def.label}
									</p>
									<PermissionGate permission="SCHOOL_STRUCTURE_CONFIGURE">
										{#snippet children({ disabled, title })}
											<RowActionMenu>
												<RowActionMenuItem
													{disabled}
													{title}
													onclick={() => onEdit(def)}
												>
													<Pencil class="h-4 w-4" />
													{$t('common.edit')}
												</RowActionMenuItem>
												<RowActionMenuItem
													destructive
													{disabled}
													{title}
													onclick={() => onDelete(def)}
												>
													<Trash2 class="h-4 w-4" />
													{$t('common.delete')}
												</RowActionMenuItem>
											</RowActionMenu>
										{/snippet}
									</PermissionGate>
								</div>
								{#if def.isBreak}
									<span
										class="mt-1.5 inline-block rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground"
									>
										{$t('periodDefinitions.break')}
									</span>
								{:else if !def.isTeachingSlot}
									<span
										class="mt-1.5 inline-block rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground"
									>
										{$t('periodDefinitions.nonTeaching')}
									</span>
								{/if}
								<p class="mt-1.5 font-mono text-[11px] text-muted-foreground">
									#{def.order} · {def.startTime} → {def.endTime}
								</p>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/each}
	</div>
</div>
