<script lang="ts">
	import type { StaffPermissionProfile } from '$lib/api/staff-permission-profiles-data';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { ChevronRight, Plus } from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { closeDetailDrawer, listSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { getPermissionProfilesPageState } from '../permission-profiles-page.svelte';
	import PermissionProfileDrawer from './PermissionProfileDrawer.svelte';
	import PermissionProfileFormModal from './PermissionProfileFormModal.svelte';

	const permissionProfilesPage = getPermissionProfilesPageState();

	afterNavigate(({ from, to }) => {
		if (from?.params?.id && to?.url.pathname === '/configuration/permission-profiles') {
			const row = document.querySelector<HTMLAnchorElement>(`a[data-profile-id="${CSS.escape(from.params.id)}"]`);
			(row ?? document.querySelector<HTMLElement>('[data-testid="permission-profiles-list"]'))?.focus({ preventScroll: true });
		}
	});

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
	let deletingProfile = $state<StaffPermissionProfile | null>(null);
	const selectedId = $derived($page.params.id);
	const selectedProfile = $derived(permissionProfilesPage.profiles.find(profile => profile.id === selectedId) ?? (deleteBusy && deletingProfile && deletingProfile.id === selectedId ? deletingProfile : undefined));
	const listHref = $derived(listSurfaceHref('/configuration/permission-profiles', $page.url));

	function detailHref(id: string) {
		return listSurfaceHref(`/configuration/permission-profiles/${encodeURIComponent(id)}`, $page.url);
	}

	function openProfile(event: MouseEvent, id: string) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
			return;
		event.preventDefault();
		openDetailDrawer(detailHref(id), listHref);
	}

	function closeProfile() {
		closeDetailDrawer(listHref);
	}

	$effect(() => {
		if (selectedId && permissionProfilesPage.slice && !selectedProfile && !deleteBusy)
			closeProfile();
	});

	const targetProfile = $derived.by((): StaffPermissionProfile | null => {
		if (!modals.target) {
			return null;
		}
		return permissionProfilesPage.profiles.find(profile => profile.id === modals.target) ?? (deleteBusy ? deletingProfile : null);
	});
	const editingProfile = $derived(modals.active === 'edit' ? targetProfile : null);
	const deleteTarget = $derived(modals.active === 'delete' ? targetProfile : null);

	const filteredProfiles = $derived(
		permissionProfilesPage.profiles.filter((profile) => {
			const needle = permissionProfilesPage.filters.values.q.trim().toLowerCase();
			if (!needle) {
				return true;
			}
			return profile.name.toLowerCase().includes(needle)
				|| (profile.description?.toLowerCase().includes(needle) ?? false);
		}),
	);

	$effect(() => {
		if (!modals.ready || !permissionProfilesPage.slice || (selectedId && !selectedProfile)) {
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
		deletingProfile = target;
		deleteBusy = true;
		try {
			const ok = await permissionProfilesPage.deleteProfile({
				profileId: target.id,
				successMessage: get(t)('permissionProfiles.toastDeleted', { name: target.name }),
			});
			if (ok) {
				if (selectedId === target.id)
					closeProfile();
				else
					deleteOpen.open = false;
			}
		}
		finally {
			deleteBusy = false;
			deletingProfile = null;
		}
	}
</script>

<div class="animate-fade-in space-y-6" data-testid="permission-profiles-list" tabindex="-1">
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
					headers: ['name', 'permissions', 'boundStaff'],
					loadAll: async () => filteredProfiles.map(profile => [
						profile.name,
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
			<div class="col-span-6">{$t('permissionProfiles.name')}</div>
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
					<li class="border-b border-border last:border-b-0">
						<a
							href={detailHref(profile.id)}
							data-profile-id={profile.id}
							aria-current={selectedId === profile.id ? 'page' : undefined}
							onclick={event => openProfile(event, profile.id)}
							class={cn('control-focus grid grid-cols-12 items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/60', selectedId === profile.id && 'bg-primary/10')}
						>
							<div class="col-span-6 min-w-0">
								<p class="break-words text-sm font-medium">{profile.name}</p>
								{#if profile.description}
									<p class="break-words text-xs text-muted-foreground">{profile.description}</p>
								{/if}
							</div>
							<div class="col-span-3 text-sm tabular-nums text-muted-foreground">{profile.permissions.length}</div>
							<div class="col-span-2 break-words text-sm tabular-nums text-muted-foreground">
								{$t('permissionProfiles.boundStaffCount', { n: permissionProfilesPage.boundCount(profile.id) })}
							</div>
							<div class="col-span-1 flex justify-end"><ChevronRight class="h-4 w-4 text-muted-foreground" aria-hidden="true" /></div>
						</a>
					</li>
				{/each}
			{/if}
		</ul>
	</div>
</div>

<PermissionProfileDrawer
	profile={selectedProfile}
	catalog={permissionProfilesPage.catalog}
	boundCount={selectedProfile ? permissionProfilesPage.boundCount(selectedProfile.id) : 0}
	onClose={closeProfile}
	onEdit={() => selectedProfile && openEdit(selectedProfile)}
	onDelete={() => selectedProfile && openDelete(selectedProfile)}
/>

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
