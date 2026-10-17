<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { StructureTab } from './lib/structure-navigation';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { sortGradeLevels } from '$lib/academic/grade-level-sort';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Plus } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { hasAnyPermission } from '$lib/permissions';
	import { cn } from '$lib/utils';
	import GradeLevelFormModal from './levels/components/GradeLevelFormModal.svelte';
	import { GradeLevelsPageState, setGradeLevelsPageState } from './levels/grade-levels-page.svelte';
	import { selectedStructureLevel, structureHref, structureTab } from './lib/structure-navigation';

	const { children }: { children: Snippet } = $props();
	const levelsPage = new GradeLevelsPageState(() => $page.url);
	setGradeLevelsPageState(levelsPage);
	const levels = $derived(sortGradeLevels(academicContext.gradeLevels));
	const selected = $derived(selectedStructureLevel(levels, $page.url.searchParams.get('gradeLevel')));
	const tab = $derived(structureTab($page.url.pathname));
	const availableTabs: StructureTab[] = $derived(([
		'details',
		...(hasAnyPermission(['ACADEMIC_CATALOG_READ', 'ACADEMIC_CATALOG_MANAGE']) ? ['subjects'] as const : []),
		...(hasAnyPermission(['SCHOOL_STRUCTURE_READ', 'SCHOOL_CONFIGURE']) ? ['classes'] as const : []),
	]));
	$effect(() => {
		if (selected && availableTabs.length && !availableTabs.includes(tab)) {
			void appGoto(structureHref($page.url, selected.id, availableTabs[0]), { replaceState: true });
		}
	});
	$effect(() => {
		const modal = $page.url.searchParams.get('modal');
		if ((tab !== 'details' && ['edit-level', 'delete-level', 'level-grading'].includes(modal ?? '')) || modal === 'level-grading') {
			const next = new URL($page.url);
			if (modal === 'level-grading')
				next.searchParams.set('modal', 'edit-level');
			void appGoto(`/configuration/structure/details${next.search}`, { replaceState: true });
		}
	});
	const search = $derived($page.url.searchParams.get('levelQ') ?? '');
	const visibleLevels = $derived(levels.filter(level =>
		`${level.name} ${level.cycle}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
	));
	const modals = createUrlSyncedModals({ allowed: ['create-level'], allowedSteps: ['confirm'], getUrl: () => $page.url });
	const createLevel = bindUrlModal(modals, 'create-level');
	$effect(() => modals.hydrate());
	$effect(() => {
		// Drawer records resolve their own level before canonicalizing a deep link.
		if (!$page.params.id && selected && $page.url.searchParams.get('gradeLevel') !== selected.id) {
			const next = new URL($page.url);
			next.searchParams.set('gradeLevel', selected.id);
			void appGoto(`${next.pathname}${next.search}`, { replaceState: true, noScroll: true });
		}
	});
	function searchLevels(value: string) {
		const next = new URL($page.url);
		if (value)
			next.searchParams.set('levelQ', value);
		else next.searchParams.delete('levelQ');
		void appGoto(`${next.pathname}${next.search}`, { replaceState: true, keepFocus: true, noScroll: true });
	}
</script>

<div class="lg:h-full">
	<div class="grid min-w-0 gap-6 lg:min-h-full lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-0">
		<aside class="min-w-0 lg:border-r lg:border-border lg:bg-card lg:p-5" aria-label={$t('structure.levels')}>
			<div class="space-y-4 lg:sticky lg:top-5">
				<div class="flex items-center justify-between gap-2">
					<h2 class="text-sm font-medium">{$t('structure.levels')}</h2>
					<PermissionGate permission="SCHOOL_CONFIGURE" mode="disable">
						{#snippet children({ disabled, title })}
							<Button variant="outline" size="sm" {disabled} {title} onclick={() => modals.open('create-level')} aria-label={$t('gradeLevels.add')}><Plus class="h-4 w-4" /></Button>
						{/snippet}
					</PermissionGate>
				</div>
				<div class="lg:hidden">
					<label class="sr-only" for="structure-level">{$t('structure.levels')}</label>
					<select id="structure-level" class="control-focus h-10 w-full rounded-xl border border-input bg-background px-3 text-sm" value={selected?.id ?? ''} onchange={event => appGoto(structureHref($page.url, event.currentTarget.value))}>
						{#each levels as level (level.id)}<option value={level.id}>{level.name}</option>{/each}
					</select>
				</div>
				<div class="hidden space-y-4 lg:block">
					<Input value={search} oninput={event => searchLevels(event.currentTarget.value)} placeholder={$t('structure.searchLevels')} aria-label={$t('structure.searchLevels')} />
					<nav class="max-h-[65vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-soft" aria-label={$t('structure.levels')}>
						{#each visibleLevels as level (level.id)}
							<a href={structureHref($page.url, level.id)} aria-current={selected?.id === level.id ? 'page' : undefined} class={cn('control-focus flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-secondary/60', selected?.id === level.id && 'bg-primary/10 font-medium text-foreground')}>
								<span>{level.name}</span><span class="text-xs tabular-nums text-muted-foreground">{levelsPage.classCountFor(level.id)}</span>
							</a>
						{:else}<p class="px-4 py-3 text-sm text-muted-foreground">{$t('structure.noLevels')}</p>{/each}
					</nav>
				</div>
			</div>
		</aside>
		<section class="flex min-w-0 flex-col gap-5 lg:p-8" aria-label={selected?.name ?? $t('config.structure')}>
			{#if selected}
				<nav class="flex gap-1 border-b border-border" aria-label={$t('structure.tabs')}>
					{#each availableTabs as item (item)}
						<a href={structureHref($page.url, selected.id, item)} aria-current={tab === item ? 'page' : undefined} class={cn('control-focus border-b-2 px-4 py-3 text-sm font-medium', tab === item ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
							{$t(`structure.${item}`)}
						</a>
					{/each}
				</nav>
				{#if availableTabs.includes(tab)}{@render children()}{/if}
			{:else}
				<div class="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{$t('structure.emptyLevels')}</div>
			{/if}
		</section>
	</div>
</div>
<GradeLevelFormModal bind:open={createLevel.open} confirm={modals.step === 'confirm'} onConfirmStep={value => modals.setStep(value ? 'confirm' : null)} />
