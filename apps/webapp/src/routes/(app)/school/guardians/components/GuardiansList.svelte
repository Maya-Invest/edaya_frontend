<script lang="ts">
	import type { Guardian } from '$lib/types/school';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import InfiniteList from '$lib/components/ui/InfiniteList.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { relationKey } from '$lib/components/school/shared/drawer-constants';
	import { t } from '$lib/i18n';
	import { Mail, Phone, Plus, Users } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { cn } from '$lib/utils';
	import { getGuardiansPageState } from '../guardians-page.svelte';
	import GuardianCreateModal from './GuardianCreateModal.svelte';

	const {
		onSelect,
		selectedId,
	}: {
		onSelect?: (guardian: Guardian) => void;
		selectedId?: string;
	} = $props();

	const guardiansPage = getGuardiansPageState();

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

	const list = $derived(guardiansPage.visibleGuardians);
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('school.guardians')}
		title={$t('people.guardiansCount', { n: guardiansPage.totalGuardians })}
	>
		{#snippet search()}
			<ListSearchField
				bind:value={guardiansPage.filters.values.q}
				oninput={() => guardiansPage.filters.scheduleSync()}
			/>
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="PARENT_CREATE"
				mode="disable"
				tooltip={$t('guardian.permissionCreate')}
			>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => (createOpen.open = true)}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('guardian.addGuardian')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<GuardianCreateModal bind:open={createOpen.open} />

	<div
		class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
		aria-busy={guardiansPage.listLoading}
	>
		<div
			class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
		>
			<div class="col-span-4">{$t('people.name')}</div>
			<div class="col-span-2">{$t('guardian.relationLabel')}</div>
			<div class="col-span-3">{$t('common.phone')}</div>
			<div class="col-span-2">{$t('students.student')}</div>
			<div class="col-span-1 text-right">·</div>
		</div>
		<InfiniteList
			hasMore={guardiansPage.guardians.length < guardiansPage.totalGuardians}
			total={guardiansPage.totalGuardians}
			visibleCount={list.length}
			loading={guardiansPage.listLoading || guardiansPage.listLoadingMore}
			onLoadMore={() => guardiansPage.loadMore()}
		>
			<ul class={cn(guardiansPage.listLoading && 'opacity-60')}>
				{#each list as guardian (guardian.id)}
					{@const active = selectedId === guardian.id}
					{@const linked = guardiansPage.linkedStudents(guardian)}
					<li>
						<button
							type="button"
							onclick={() => onSelect?.(guardian)}
							class={cn(
								'grid w-full grid-cols-12 items-center gap-4 border-b border-border px-5 py-3.5 text-left transition-colors last:border-b-0',
								active ? 'bg-primary/10' : 'hover:bg-secondary',
							)}
						>
							<div class="col-span-4 flex items-center gap-3">
								<div
									class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-xs font-semibold text-primary-foreground"
								>
									{guardian.initials}
								</div>
								<div class="min-w-0">
									<p class="truncate text-sm font-medium">{guardian.name}</p>
									<p class="flex items-center gap-1 truncate text-xs text-muted-foreground">
										<Mail class="h-3 w-3" />
										{guardian.email}
									</p>
								</div>
							</div>
							<div class="col-span-2">
								<span
									class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
								>
									{$t(relationKey[guardian.relation])}
								</span>
							</div>
							<div class="col-span-3">
								<p class="flex items-center gap-1 text-xs text-muted-foreground">
									<Phone class="h-3 w-3" />
									{guardian.phone}
								</p>
							</div>
							<div class="col-span-2">
								{#if linked.length > 0}
									<div class="flex flex-wrap gap-1">
										{#each linked as student (student.id)}
											<span
												class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-accent-foreground"
											>
												{student.name}
											</span>
										{/each}
									</div>
								{:else}
									<span class="text-xs text-muted-foreground">—</span>
								{/if}
							</div>
							<div class="col-span-1 flex justify-end">
								<Users class="h-4 w-4 text-muted-foreground" />
							</div>
						</button>
					</li>
				{/each}
				{#if list.length === 0 && !guardiansPage.listLoading}
					<li class="px-5 py-12 text-center text-sm text-muted-foreground">
						{$t('students.noMatch')}
					</li>
				{/if}
			</ul>
		</InfiniteList>
	</div>
</div>
