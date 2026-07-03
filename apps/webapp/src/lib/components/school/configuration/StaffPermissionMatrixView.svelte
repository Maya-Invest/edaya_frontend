<script lang="ts">
	import { page } from '$app/stores';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { Search, ChevronRight, ShieldCheck } from '$lib/icons';
	import { readRoleListFilters, writeRoleListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';
	import { ROLE_TINT } from '../shared/drawer-constants';
	import PersonAvatar from '../shared/PersonAvatar.svelte';

	const {
		onSelect,
		selectedStaffId,
	}: {
		onSelect?: (staffId: string) => void;
		selectedStaffId?: string;
	} = $props();

	const staff = $derived(detailDataContext.staff.filter(member => member.isActive));

	const initialFilters = $derived(readRoleListFilters($page.url));

	let q = $state('');
	let filtersReady = $state(false);

	const list = $derived.by(() => {
		const term = q.trim().toLowerCase();
		return staff.filter((member) => {
			if (!term) {
				return true;
			}
			const roleLabel = $t(`staff.role.${member.role}`).toLowerCase();
			return member.name.toLowerCase().includes(term)
				|| member.email.toLowerCase().includes(term)
				|| roleLabel.includes(term);
		});
	});

	function permissionCount(staffId: string) {
		return detailDataContext.assignmentsForStaff(staffId).length;
	}

	function syncFiltersToUrl() {
		const href = writeRoleListFilters($page.url, { q });
		appGoto(href, { replaceState: true, keepFocus: true, noScroll: true });
	}

	$effect(() => {
		const next = initialFilters;
		q = next.q;
		filtersReady = true;
	});

	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	function scheduleFilterSync() {
		if (!filtersReady) {
			return;
		}
		clearTimeout(searchTimer);
		searchTimer = setTimeout(syncFiltersToUrl, 250);
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('roles.eyebrow')}
		title={$t('roles.count', { n: list.length })}
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
	</ListPageHeader>

	<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		<div
			class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
		>
			<div class="col-span-5">{$t('roles.columnStaff')}</div>
			<div class="col-span-4">{$t('roles.columnRole')}</div>
			<div class="col-span-2 text-center">{$t('roles.columnPermissions')}</div>
			<div class="col-span-1"></div>
		</div>
		<ul>
			{#each list as member (member.id)}
				{@const active = selectedStaffId === member.id}
				{@const count = permissionCount(member.id)}
				<li>
					<button
						type="button"
						onclick={() => onSelect?.(member.id)}
						class={cn(
							'grid w-full grid-cols-12 items-center gap-4 border-b border-border px-5 py-4 text-left transition-colors last:border-b-0',
							active ? 'bg-primary/10' : 'hover:bg-secondary',
						)}
					>
						<div class="col-span-5 flex items-center gap-3">
							<PersonAvatar
								name={member.name}
								initials={member.initials}
								photoUrl={member.photoUrl}
								size="md"
							/>
							<div class="min-w-0">
								<p class="truncate text-sm font-semibold">{member.name}</p>
								<p class="truncate text-xs text-muted-foreground">{member.email || member.department}</p>
							</div>
						</div>
						<div class="col-span-4">
							<span
								class={cn(
									'inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium',
									ROLE_TINT[member.role],
								)}
							>
								{$t(`staff.role.${member.role}`)}
							</span>
						</div>
						<div class="col-span-2 text-center">
							<span
								class="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
							>
								<ShieldCheck class="h-3 w-3" />
								{count}
							</span>
						</div>
						<div class="col-span-1 flex justify-end">
							<ChevronRight class="h-4 w-4 text-muted-foreground" />
						</div>
					</button>
				</li>
			{/each}
			{#if list.length === 0}
				<li class="px-5 py-12 text-center text-sm text-muted-foreground">
					{$t('roles.empty')}
				</li>
			{/if}
		</ul>
	</div>
</div>
