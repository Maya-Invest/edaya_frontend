<script lang="ts">
	import type { ClassNode } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import { t } from '$lib/i18n';
	import { Layers, Pencil, Plus, Search, Trash2 } from '$lib/icons';
	import { readClassGroupListFilters, writeClassGroupListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { toast } from '$lib/toast.svelte';
	import { get } from 'svelte/store';
	import ClassGroupFormModal from './ClassGroupFormModal.svelte';

	const initialFilters = $derived(readClassGroupListFilters($page.url));

	let q = $state('');
	let filtersReady = $state(false);
	let createOpen = $state(false);
	let editingClass = $state<ClassNode | undefined>(undefined);

	const filteredHierarchy = $derived.by(() => {
		const needle = q.trim().toLowerCase();
		if (!needle)
			return academicContext.hierarchy;
		return academicContext.hierarchy
			.map(group => ({
				...group,
				classes: group.classes.filter((cls) => {
					const level = academicContext.gradeLevelById(cls.gradeLevelId);
					return cls.name.toLowerCase().includes(needle)
						|| cls.id.toLowerCase().includes(needle)
						|| (level?.name.toLowerCase().includes(needle) ?? false)
						|| group.level.toLowerCase().includes(needle);
				}),
			}))
			.filter(group => group.classes.length > 0);
	});

	const filteredCount = $derived(
		filteredHierarchy.reduce((acc, group) => acc + group.classes.length, 0),
	);

	function openCreate() {
		editingClass = undefined;
		createOpen = true;
	}

	function openEdit(classId: string) {
		editingClass = academicContext.classes.find(entry => entry.id === classId);
		createOpen = true;
	}

	function handleDelete(_classId: string) {
		toast.error(get(t)('classGroups.deleteUnsupported'));
	}

	function syncFiltersToUrl() {
		const href = writeClassGroupListFilters($page.url, { q });
		appGoto(href, { replaceState: true, keepFocus: true, noScroll: true });
	}

	$effect(() => {
		const next = initialFilters;
		q = next.q;
		filtersReady = true;
	});

	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	function scheduleFilterSync() {
		if (!filtersReady)
			return;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(syncFiltersToUrl, 250);
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('classGroups.subtitle')}
		title={$t('classGroups.title', { n: filteredCount })}
	>
		{#snippet search()}
			<div class="relative">
				<Search
					class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					bind:value={q}
					oninput={scheduleFilterSync}
					placeholder={$t('common.search')}
					class="h-9 w-56 rounded-full pl-9 text-sm"
				/>
			</div>
		{/snippet}
		{#snippet primary()}
			<Button size="sm" class="rounded-full" onclick={openCreate}>
				<Plus class="mr-1 h-4 w-4" />
				{$t('classGroups.add')}
			</Button>
		{/snippet}
	</ListPageHeader>

	<div class="space-y-6">
		{#each filteredHierarchy as group (group.level)}
			<section>
				<h3 class="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
					<Layers class="h-4 w-4 text-muted-foreground" />
					{group.level}
				</h3>
				<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
					<table class="w-full text-sm">
						<thead class="border-b border-border bg-secondary/30 text-left">
							<tr>
								<th class="px-4 py-3 font-medium">{$t('classGroups.name')}</th>
								<th class="px-4 py-3 font-medium">{$t('classGroups.gradeLevel')}</th>
								<th class="px-4 py-3 font-medium">{$t('classGroups.studentCount')}</th>
								<th class="px-4 py-3 text-right font-medium">{$t('classGroups.actions')}</th>
							</tr>
						</thead>
						<tbody>
							{#each group.classes as cls (cls.id)}
								{@const level = academicContext.gradeLevelById(cls.gradeLevelId)}
								<tr class="border-b border-border/60 last:border-0">
									<td class="px-4 py-3">
										<p class="font-medium">{cls.name}</p>
										<p class="font-mono text-[10px] text-muted-foreground">{cls.id}</p>
									</td>
									<td class="px-4 py-3 text-muted-foreground">{level?.name ?? '—'}</td>
									<td class="px-4 py-3 font-mono">{cls.studentCount}</td>
									<td class="px-4 py-3">
										<div class="flex justify-end gap-1">
											<button
												type="button"
												class="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
												title={$t('classGroups.edit')}
												onclick={() => openEdit(cls.id)}
											>
												<Pencil class="h-3.5 w-3.5" />
											</button>
											<button
												type="button"
												class="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
												title={$t('classGroups.delete')}
												onclick={() => handleDelete(cls.id)}
											>
												<Trash2 class="h-3.5 w-3.5" />
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/each}
	</div>
</div>

<ClassGroupFormModal bind:open={createOpen} classGroup={editingClass} />
