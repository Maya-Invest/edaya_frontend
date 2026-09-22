<script lang="ts">
	import type { StaffPermissionProfile } from '$lib/api/staff-permission-profiles-data';
	import { page } from '$app/stores';
	import { PROFILE_SCOPE_GRAINS, profileGrainLabelKey } from '$lib/api/grant-scopes';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { Pencil, Plus, Trash2 } from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { get } from 'svelte/store';
	import { getPermissionProfilesPageState } from '../permission-profiles-page.svelte';
	import PermissionProfileFormModal from './PermissionProfileFormModal.svelte';

	const permissionProfilesPage = getPermissionProfilesPageState();

	const modals = createUrlSyncedModals({
		allowed: ['create', 'edit', 'delete'],
		getUrl: () => $page.url,
	});
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');
	const editOpen = bindUrlModal(modals, 'edit');
	const deleteOpen = bindUrlModal(modals, 'delete');

	let deleteBusy = $state(false);

	const targetProfile = $derived.by((): StaffPermissionProfile | null => {
		if (!modals.target) {
			return null;
		}
		return permissionProfilesPage.profiles.find(profile => profile.id === modals.target) ?? null;
	});
	const editingProfile = $derived(modals.active === 'edit' ? targetProfile : null);
	const deleteTarget = $derived(modals.active === 'delete' ? targetProfile : null);

	const grainOptions = $derived([
		{ value: 'all', label: $t('permissionProfiles.filterAllGrains') },
		...PROFILE_SCOPE_GRAINS.map(grain => ({
			value: grain,
			label: $t(profileGrainLabelKey(grain)),
		})),
	]);

	const filteredProfiles = $derived(
		permissionProfilesPage.profiles.filter((profile) => {
			if (
				permissionProfilesPage.filters.values.grain !== 'all'
				&& profile.scopeGrain !== permissionProfilesPage.filters.values.grain
			) {
				return false;
			}
			const needle = permissionProfilesPage.filters.values.q.trim().toLowerCase();
			if (!needle) {
				return true;
			}
			return profile.name.toLowerCase().includes(needle)
				|| (profile.description?.toLowerCase().includes(needle) ?? false);
		}),
	);

	$effect(() => {
		if (!permissionProfilesPage.filters.ready) {
			return;
		}
		void permissionProfilesPage.filters.values.grain;
		permissionProfilesPage.filters.scheduleSync();
	});

	$effect(() => {
		if (!modals.ready) {
			return;
		}
		if (modals.active === 'create') {
			if (modals.target !== null) {
				modals.open('create');
			}
			return;
		}
		if (
			(modals.active === 'edit' && !editingProfile)
			|| (modals.active === 'delete' && !deleteTarget)
		) {
			modals.close();
		}
	});

	function openEdit(profile: StaffPermissionProfile) {
		modals.open('edit', { target: profile.id });
	}

	function openDelete(profile: StaffPermissionProfile) {
		modals.open('delete', { target: profile.id });
	}

	async function confirmDelete() {
		const target = deleteTarget;
		if (!target) {
			return;
		}
		deleteBusy = true;
		try {
			const ok = await permissionProfilesPage.deleteProfile({
				profileId: target.id,
				successMessage: get(t)('permissionProfiles.toastDeleted', { name: target.name }),
			});
			if (ok) {
				deleteOpen.open = false;
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

<div class="animate-fade-in space-y-6">
	<ListPageHeader
		eyebrow={$t('permissionProfiles.subtitle')}
		title={$t('permissionProfiles.title', { n: filteredProfiles.length })}
	>
		{#snippet search()}
			<ListSearchField
				bind:value={permissionProfilesPage.filters.values.q}
				oninput={() => permissionProfilesPage.filters.scheduleSync()}
			/>
		{/snippet}
		{#snippet filters()}
			<FilterSelect
				bind:value={permissionProfilesPage.filters.values.grain}
				options={grainOptions}
				class="h-9 min-w-[10rem]"
			/>
		{/snippet}
		{#snippet primary()}
			<PermissionGate permission="ACCESS_CONTROL_CONFIGURE">
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => modals.open('create')}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('permissionProfiles.add')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu
				exportOnly
				onExport={() => void exportMatchingList({
					filename: 'permission-profiles.csv',
					headers: ['name', 'grain', 'permissions', 'boundStaff'],
					loadAll: async () => filteredProfiles.map(profile => [
						profile.name,
						profile.scopeGrain,
						profile.permissions.length,
						permissionProfilesPage.boundCount(profile.id),
					]),
				})}
			/>
		{/snippet}
	</ListPageHeader>

	<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		<div
			class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
		>
			<div class="col-span-4">{$t('permissionProfiles.name')}</div>
			<div class="col-span-2">{$t('permissionProfiles.grain')}</div>
			<div class="col-span-3">{$t('permissionProfiles.permissions')}</div>
			<div class="col-span-2">{$t('permissionProfiles.boundStaff')}</div>
			<div class="col-span-1"></div>
		</div>
		<ul>
			{#if filteredProfiles.length === 0}
				<li class="px-5 py-12 text-center text-sm text-muted-foreground">
					{$t('permissionProfiles.empty')}
				</li>
			{:else}
				{#each filteredProfiles as profile (profile.id)}
					<li class="grid grid-cols-12 items-center gap-4 border-b border-border px-5 py-4 last:border-b-0">
						<div class="col-span-4 min-w-0">
							<p class="truncate text-sm font-medium">{profile.name}</p>
							{#if profile.description}
								<p class="truncate text-xs text-muted-foreground">{profile.description}</p>
							{/if}
						</div>
						<div class="col-span-2">
							<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
								{$t(profileGrainLabelKey(profile.scopeGrain))}
							</span>
						</div>
						<div class="col-span-3 text-sm tabular-nums text-muted-foreground">
							{profile.permissions.length}
						</div>
						<div class="col-span-2 text-sm tabular-nums text-muted-foreground">
							{$t('permissionProfiles.boundStaffCount', { n: permissionProfilesPage.boundCount(profile.id) })}
						</div>
						<div class="col-span-1 flex justify-end">
							<PermissionGate permission="ACCESS_CONTROL_CONFIGURE">
								{#snippet children({ disabled, title })}
									<RowActionMenu>
										<RowActionMenuItem {disabled} {title} onclick={() => openEdit(profile)}>
											<Pencil class="h-4 w-4" />
											{$t('common.edit')}
										</RowActionMenuItem>
										<RowActionMenuItem
											destructive
											{disabled}
											{title}
											onclick={() => openDelete(profile)}
										>
											<Trash2 class="h-4 w-4" />
											{$t('common.delete')}
										</RowActionMenuItem>
									</RowActionMenu>
								{/snippet}
							</PermissionGate>
						</div>
					</li>
				{/each}
			{/if}
		</ul>
	</div>
</div>

<PermissionProfileFormModal bind:open={createOpen.open} />
<PermissionProfileFormModal bind:open={editOpen.open} profile={editingProfile} />

<ConfirmModal
	bind:open={deleteOpen.open}
	title={$t('common.deleteConfirmTitle')}
	description={$t('permissionProfiles.deleteConfirm', { name: deleteTarget?.name ?? '' })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
