<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import { dotByColor } from '$lib/components/school/shared/drawer-constants';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { lang, t } from '$lib/i18n';
	import { catalogCategory, catalogSubjectName } from '$lib/i18n/catalog-label';
	import { ChevronRight } from '$lib/icons';
	import { cn } from '$lib/utils';

	const {
		subject,
		active = false,
		onSelect,
		onEdit,
	}: {
		subject: Subject;
		active?: boolean;
		onSelect?: () => void;
		onEdit?: () => void;
	} = $props();
</script>

<div class="flex items-center border-b border-border last:border-0">
	<button
		data-entity-id={subject.id}
		type="button"
		onclick={() => onSelect?.()}
		class={cn(
			'flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-secondary',
			active && 'bg-primary/10',
		)}
	>
		<div class={cn('h-8 w-1.5 shrink-0 rounded-full', dotByColor[subject.color])}></div>
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-2">
				<span class="font-display text-sm font-semibold">{catalogSubjectName(subject.name, $lang, subject.code)}</span>
				<span
					class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
				>
					{catalogCategory(subject.category, $lang)}
				</span>
			</div>
			<p class="mt-0.5 truncate text-xs text-muted-foreground">{subject.description}</p>
		</div>
		<div class="flex max-w-[40%] shrink-0 items-center gap-2 text-right text-xs text-muted-foreground">
			<ChevronRight class="h-4 w-4 text-muted-foreground" />
		</div>
	</button>

	<div class="pr-2">
		<RowActionMenu label={`${$t('list.rowActions')} · ${catalogSubjectName(subject.name, $lang, subject.code)}`}>
			<PermissionGate permission="ACADEMIC_CATALOG_MANAGE" mode="disable">
				{#snippet children({ disabled, title })}<RowActionMenuItem {disabled} {title} onclick={onEdit}>{$t('common.edit')}</RowActionMenuItem>{/snippet}
			</PermissionGate>
		</RowActionMenu>
	</div>
</div>
