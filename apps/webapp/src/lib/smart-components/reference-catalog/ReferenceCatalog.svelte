<script lang="ts">
	import ShortNameField from '$lib/components/school/shared/ShortNameField.svelte';
	import { provideCollectionPresentation } from '$lib/list/collection-presentation.svelte';

	provideCollectionPresentation();
	import type { ReferenceCatalogueKind } from './reference-catalog-state.svelte';
	import { page } from '$app/stores';
	import { authSession } from '$lib/auth/session.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { hasAnyPermission, hasPermission } from '$lib/permissions';
	import { ReferenceCatalogState } from './reference-catalog-state.svelte';

	const { kind }: {
		kind: ReferenceCatalogueKind;
	} = $props();
	const catalogue = $derived(new ReferenceCatalogState(kind));
	const modals = createUrlSyncedModals({ allowed: ['create', 'edit', 'delete'], getUrl: () => $page.url });
	const create = bindUrlModal(modals, 'create');
	const edit = bindUrlModal(modals, 'edit');
	const remove = bindUrlModal(modals, 'delete');
	const canManage = $derived(hasPermission('ACADEMIC_CATALOG_MANAGE'));
	const canRead = $derived(hasAnyPermission(['ACADEMIC_CATALOG_READ', 'ACADEMIC_CATALOG_MANAGE']));
	const target = $derived(catalogue.rows.find(row => row.id === modals.target));
	let shortName = $state('');
	let label = $state('');
	let isActive = $state(true);
	let initialized = $state('');
	let searchTerm = $state('');
	const title = $derived($t(`profile.${kind}`));
	const rows = $derived(catalogue.rows.filter(row => `${row.shortName} ${row.label}`.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase())));
	$effect(() => modals.hydrate());
	$effect(() => {
		if (!modals.active) {
			initialized = '';
			return;
		}
		const identity = `${modals.active}:${modals.target}:${authSession.schoolId}`;
		if (initialized !== identity && (modals.active === 'create' || target)) {
			initialized = identity;
			shortName = target?.shortName ?? '';
			label = target?.label ?? '';
			isActive = target?.isActive ?? true;
		}
	});
	async function save() {
		if (!canManage || !label.trim())
			return;
		if (await catalogue.save({ id: modals.active === 'edit' ? target?.id : undefined, shortName, label, isActive }))
			modals.close();
	}
	async function confirmRemove() {
		if (canManage && target && await catalogue.remove(target.id))
			modals.close();
	}
</script>
{#if canRead}
	<PageQuery cache={false} query={catalogue.query} cacheKey={() => `${kind}:${authSession.schoolId}`} loadingTitle={title}>
		{#snippet children(data)}<DataState status={data.status} errorMessage={data.errorMessage} preserveShell>
			<ListPageHeader {title}>
				{#snippet search()}<Input bind:value={searchTerm} aria-label={$t('common.search')} />{/snippet}
				{#snippet primary()}{#if canManage}<Button onclick={() => modals.open('create')}>{$t('common.add')}</Button>{/if}{/snippet}
			</ListPageHeader>
			<ListEntityTable listKey={kind} rows={rows} columns={[{ key: 'shortName', label: $t('profile.shortName'), span: 2 }, { key: 'label', label: $t('people.name'), span: 5 }, { key: 'status', label: $t('common.status'), span: 2 }, { key: 'actions', label: '', span: 1 }]}>
				{#snippet cell(row, column)}
					{#if column.key === 'shortName'}<span class="font-medium">{row.shortName}</span>{:else if column.key === 'label'}{row.label}{:else if column.key === 'status'}{$t(row.isActive ? 'teacher.statusActive' : 'teacher.statusInactive')}{:else if canManage}<RowActionMenu label={`${$t('list.rowActions')} · ${row.label}`}><RowActionMenuItem onclick={() => modals.open('edit', { target: row.id })}>{$t('common.edit')}</RowActionMenuItem><RowActionMenuItem onclick={() => modals.open('delete', { target: row.id })}>{$t('common.delete')}</RowActionMenuItem></RowActionMenu>{/if}
				{/snippet}
			</ListEntityTable>
		</DataState>{/snippet}
	</PageQuery>
	<FormModal open={create.open || edit.open} onOpenChange={(open) => {
		if (!open)
			modals.close();
	}} title={title} submitLabel={$t('common.save')} busy={catalogue.busy} submitDisabled={!canManage || !label.trim() || (edit.open && !target)} onSubmit={save}>
		<ShortNameField name={label} bind:value={shortName} creating={create.open} />
		<Label class="block space-y-2"><span>{$t('people.name')}</span><Input bind:value={label} /></Label>
		<Label class="flex items-center gap-2"><Checkbox bind:checked={isActive} />{$t('teacher.statusActive')}</Label>
	</FormModal>
	<ConfirmModal bind:open={remove.open} title={$t('common.delete')} description={target ? `${target.shortName} · ${target.label}` : ''} busy={catalogue.busy} confirmDisabled={!canManage || !target} onConfirm={confirmRemove} />
{:else}<p class="text-muted-foreground">{$t('profile.restricted')}</p>{/if}
