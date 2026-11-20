<script lang="ts">
	import type { PermissionCatalogEntry } from '$lib/api/staff-permission-assignments-data';
	import type { StaffPermissionProfile } from '$lib/api/staff-permission-profiles-data';
	import { formatPermissionLabel } from '$lib/api/staff-permission-assignments-data';
	import { formatPermissionGroupLabel } from '$lib/api/staff-permission-profiles-data';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DrawerFrame from '$lib/components/ui/DrawerFrame.svelte';
	import { t } from '$lib/i18n';
	import { Pencil, Trash2, X } from '$lib/icons';
	import { hasPermission } from '$lib/permissions';
	import PermissionScopeTypes from '$lib/smart-components/scope-builder/PermissionScopeTypes.svelte';
	import { profilePermissionGroups } from '../lib/permission-profiles-helpers';

	const { profile, catalog, boundCount, onClose, onEdit, onDelete }: {
		profile?: StaffPermissionProfile;
		catalog: PermissionCatalogEntry[];
		boundCount: number;
		onClose: () => void;
		onEdit: () => void;
		onDelete: () => void;
	} = $props();

	const groups = $derived(profilePermissionGroups(profile?.permissions ?? [], catalog));
</script>

<DrawerFrame open={Boolean(profile)} {onClose} label={$t('config.permissionProfiles')} testId="permission-profile-drawer">
	<div class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-6 py-4">
		<span class="text-sm">{$t('config.permissionProfiles')}</span>
		<Button variant="ghost" size="icon" aria-label={$t('common.close')} onclick={onClose}><X class="h-4 w-4" /></Button>
	</div>
	{#if profile}
		<div class="scrollbar-thin min-h-0 flex-1 space-y-6 overflow-y-auto break-words p-6">
			<DrawerEntityHeader name={profile.name} summary={profile.description ?? undefined} actions={hasPermission('ACCESS_CONTROL_MANAGE') ? actions : undefined} overflow={hasPermission('ACCESS_CONTROL_MANAGE') ? overflow : undefined} />
			{#snippet actions()}
				<Button variant="outline" onclick={onEdit}><Pencil class="mr-2 h-4 w-4" />{$t('common.edit')}</Button>
			{/snippet}
			{#snippet overflow()}
				<Button variant="ghost" class="w-full justify-start text-destructive hover:text-destructive" onclick={onDelete}><Trash2 class="mr-2 h-4 w-4" />{$t('common.delete')}</Button>
			{/snippet}
			<div class="grid grid-cols-2 gap-4 text-sm">
				<DrawerField label={$t('permissionProfiles.permissions')}><p class="tabular-nums">{profile.permissions.length}</p></DrawerField>
				<DrawerField label={$t('permissionProfiles.boundStaff')}><p class="tabular-nums">{$t('permissionProfiles.boundStaffCount', { n: boundCount })}</p></DrawerField>
			</div>
			<section aria-label={$t('permissionProfiles.permissions')} class="space-y-8">
				{#each groups as group (group.key)}
					<div class="space-y-2">
						<h4 class="font-display text-base font-bold text-foreground">{formatPermissionGroupLabel(group.key, $t)}</h4>
						<ul class="divide-y divide-border">
							{#each group.entries as item (item.permission)}
								<li class="flex flex-wrap items-center gap-x-2 gap-y-1 py-3 text-sm" data-permission={item.permission}>
									<span>{formatPermissionLabel(item.permission, $t)}</span>
									<PermissionScopeTypes entry={item.entry} />
								</li>
							{/each}
						</ul>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">{$t('permissionProfiles.noPermissions')}</p>
				{/each}
			</section>
		</div>
	{/if}
</DrawerFrame>
