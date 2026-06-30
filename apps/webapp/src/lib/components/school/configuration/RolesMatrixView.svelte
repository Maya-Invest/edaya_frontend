<script lang="ts">
	import type { StaffRole } from '$lib/types/school';
	import { page } from '$app/stores';
	import { authSession } from '$lib/auth/session.svelte';
	import { ROLE_TINT } from '$lib/components/school/shared/drawer-constants';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import {
		ShieldCheck,
		Search,
		Crown,
		GraduationCap,
		HeartHandshake,
		ChevronRight,
		Users,
	} from '$lib/icons';
	import { readRoleListFilters, writeRoleListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';
	import PersonAvatar from '../shared/PersonAvatar.svelte';

	const {
		onSelect,
		selectedRole,
	}: {
		onSelect?: (role: StaffRole) => void;
		selectedRole?: StaffRole;
	} = $props();

	const staff = $derived(detailDataContext.staff);

	const ROLE_KEYS: StaffRole[] = ['directeur', 'prof_principal', 'professeur', 'educateur'];

	const initialFilters = $derived(readRoleListFilters($page.url));

	let q = $state('');
	let filtersReady = $state(false);

	const me = $derived(authSession.user);

	const list = $derived.by(() => {
		const term = q.trim().toLowerCase();
		return ROLE_KEYS.filter((key) => {
			if (!term)
				return true;
			const label = $t(`staff.role.${key}`).toLowerCase();
			const desc = $t(`roles.desc.${key}`).toLowerCase();
			return label.includes(term) || desc.includes(term) || key.includes(term);
		});
	});

	function countByRole(r: StaffRole) {
		return staff.filter(s => s.role === r).length;
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
		if (!filtersReady)
			return;
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
		{#snippet filters()}
			{#if me}
				<div
					class="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground shadow-soft"
				>
					<PersonAvatar
						name={me.name}
						initials={me.initials}
						photoUrl={me.photoUrl}
						size="sm"
					/>
					<span class="font-mono uppercase tracking-wider">{$t(`staff.role.${me.role}`)}</span>
				</div>
			{/if}
		{/snippet}
	</ListPageHeader>

	<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		<div
			class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
		>
			<div class="col-span-5">{$t('roles.columnRole')}</div>
			<div class="col-span-5">{$t('roles.columnDescription')}</div>
			<div class="col-span-1 text-center">{$t('roles.columnMembers')}</div>
			<div class="col-span-1"></div>
		</div>
		<ul>
			{#each list as key (key)}
				{@const active = selectedRole === key}
				{@const count = countByRole(key)}
				<li>
					<button
						type="button"
						onclick={() => onSelect?.(key)}
						class={cn(
							'grid w-full grid-cols-12 items-center gap-4 border-b border-border px-5 py-4 text-left transition-colors last:border-b-0',
							active ? 'bg-primary/10' : 'hover:bg-secondary',
						)}
					>
						<div class="col-span-5 flex items-center gap-3">
							<span
								class={cn(
									'flex h-10 w-10 items-center justify-center rounded-xl',
									ROLE_TINT[key],
								)}
							>
								{#if key === 'directeur'}
									<Crown class="h-4 w-4" />
								{:else if key === 'prof_principal'}
									<ShieldCheck class="h-4 w-4" />
								{:else if key === 'professeur'}
									<GraduationCap class="h-4 w-4" />
								{:else}
									<HeartHandshake class="h-4 w-4" />
								{/if}
							</span>
							<div class="min-w-0">
								<p class="truncate text-sm font-semibold">{$t(`staff.role.${key}`)}</p>
								<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
									{key}
								</p>
							</div>
						</div>
						<div class="col-span-5 text-sm text-muted-foreground">{$t(`roles.desc.${key}`)}</div>
						<div class="col-span-1 text-center">
							<span
								class="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
							>
								<Users class="h-3 w-3" />
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
