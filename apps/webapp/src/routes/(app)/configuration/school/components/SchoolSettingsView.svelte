<script lang="ts">
	import type { SchoolIssuanceAssetPurpose } from '$lib/api/mutations/issuance-asset.mutations';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Pencil } from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { hasAnyPermission } from '$lib/permissions';
	import { get } from 'svelte/store';
	import { getSchoolPageState } from '../school-page.svelte';
	import IssuanceAssetSlot from './IssuanceAssetSlot.svelte';
	import SchoolTimetableSettings from './SchoolTimetableSettings.svelte';

	const owner = getSchoolPageState();
	const school = $derived(owner.school);
	const sections = [
		{ id: 'identity', title: 'schoolSettings.sectionIdentity', fields: ['name', 'shortName'] },
		{ id: 'issuing', title: 'schoolSettings.sectionIssuing', fields: ['issuingName', 'postalAddress', 'phone', 'email', 'schoolCode'] },
		{ id: 'location', title: 'schoolSettings.sectionLocation', fields: ['city', 'country', 'timeZone', 'financeCurrency'] },
	] as const;
	const modals = createUrlSyncedModals({ allowed: ['identity', 'issuing', 'location', 'assets'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const identity = bindUrlModal(modals, 'identity');
	const issuing = bindUrlModal(modals, 'issuing');
	const location = bindUrlModal(modals, 'location');
	const assets = bindUrlModal(modals, 'assets');
	const editors = { identity, issuing, location };
	let draft = $state<Record<string, string>>({});
	let initialized = '';
	let busy = $state(false);
	let assetBusy = $state<SchoolIssuanceAssetPurpose | null>(null);
	$effect.pre(() => {
		const active = modals.active ?? '';
		if (active !== initialized && school) {
			draft = Object.fromEntries(sections.flatMap(section => section.fields.map(key => [key, school[key] ?? ''])));
			initialized = active;
		}
	});
	const assetSlots = [
		{ purpose: 'school.logo', slot: 'logoAttachmentId', key: 'logo', public: true },
		{ purpose: 'school.crest', slot: 'crestAttachmentId', key: 'crest', public: true },
		{ purpose: 'school.stamp', slot: 'stampAttachmentId', key: 'stamp', public: false },
		{ purpose: 'school.signature', slot: 'signatureAttachmentId', key: 'signature', public: false },
	] as const;
	async function save(section: typeof sections[number]) {
		if (busy || !hasAnyPermission(['SCHOOL_LIFECYCLE_MANAGE']))
			return;
		busy = true;
		try {
			const fields = Object.fromEntries(section.fields.map(key => [key, key === 'financeCurrency' ? draft[key]?.trim().toUpperCase() : draft[key]?.trim() || null]));
			if (await owner.updateSettings({ ...fields, successMessage: get(t)('schoolSettings.toastSaved') }))
				modals.close();
		}
		finally {
			busy = false;
		}
	}
	async function upload(purpose: SchoolIssuanceAssetPurpose, file: File) {
		assetBusy = purpose;
		try {
			if (await owner.performUploadSchoolIssuanceAsset({ purpose, file, successMessage: get(t)('schoolSettings.assetToast', { slot: get(t)(`schoolSettings.asset.${purpose.split('.')[1]}`) }) }))
				await owner.refreshSlice();
		}
		finally {
			assetBusy = null;
		}
	}
	async function clear(purpose: SchoolIssuanceAssetPurpose) {
		assetBusy = purpose;
		try {
			if (await owner.performClearSchoolIssuanceAsset({ purpose, successMessage: get(t)('schoolSettings.assetClearedToast', { slot: get(t)(`schoolSettings.asset.${purpose.split('.')[1]}`) }) }))
				await owner.refreshSlice();
		}
		finally {
			assetBusy = null;
		}
	}
	async function publishAsset(purpose: SchoolIssuanceAssetPurpose, next: boolean) {
		if (purpose !== 'school.logo' && purpose !== 'school.crest')
			return;
		assetBusy = purpose;
		try {
			const current = (school?.publicBrandingPurposes ?? []).filter((value): value is 'school.logo' | 'school.crest' => value === 'school.logo' || value === 'school.crest');
			await owner.updatePublicBranding(next ? [...new Set([...current, purpose])] : current.filter(value => value !== purpose));
		}
		finally {
			assetBusy = null;
		}
	}
</script>

<div class="animate-fade-in space-y-6">
	<ListPageHeader eyebrow={$t('schoolSettings.eyebrow')} title={$t('schoolSettings.title')}>
		{#snippet more()}<ListMoreMenu exportOnly onExport={() => void exportMatchingList({ filename: 'school-settings.csv', headers: sections.flatMap(s => [...s.fields]), loadAll: async () => school ? [sections.flatMap(s => s.fields.map(key => school[key] ?? ''))] : [] })} />{/snippet}
	</ListPageHeader>
	{#if school}
		<div class="mx-auto w-full max-w-3xl space-y-5">
			{#each sections as section (section.id)}
				<section class="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="font-display text-lg font-semibold">{$t(section.title)}</h2>
						<PermissionGate permission="SCHOOL_LIFECYCLE_MANAGE" mode="disable">{#snippet children({ disabled, title })}<Button variant="outline" size="sm" {disabled} {title} onclick={() => modals.open(section.id)}><Pencil class="mr-2 h-4 w-4" />{$t('common.edit')}</Button>{/snippet}</PermissionGate>
					</div>
					<dl class="grid min-w-0 gap-4 sm:grid-cols-2">
						{#each section.fields as key (key)}<div class="min-w-0"><dt class="text-sm text-muted-foreground">{$t(`schoolSettings.${key}`)}</dt><dd class="mt-1 break-words text-sm font-medium">{school[key] || '—'}</dd></div>{/each}
					</dl>
				</section>
			{/each}
			<SchoolTimetableSettings />
			<section class="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
				<div class="flex flex-wrap items-center justify-between gap-3"><h2 class="font-display text-lg font-semibold">{$t('schoolSettings.sectionIssuanceAssets')}</h2><PermissionGate permission="SCHOOL_LIFECYCLE_MANAGE" mode="disable">{#snippet children({ disabled, title })}<Button variant="outline" size="sm" {disabled} {title} onclick={() => modals.open('assets')}><Pencil class="mr-2 h-4 w-4" />{$t('common.edit')}</Button>{/snippet}</PermissionGate></div>
				{#each assetSlots as asset (asset.purpose)}<IssuanceAssetSlot readOnly purpose={asset.purpose} label={$t(`schoolSettings.asset.${asset.key}`)} attachmentId={school[asset.slot]} publicAllowed={(school.publicBrandingPurposes ?? []).includes(asset.purpose as 'school.logo' | 'school.crest')} canPublish={asset.public} canManage={false} busy={false} onUpload={() => {}} onClear={() => {}} onPublicChange={() => {}} />{/each}
			</section>
		</div>
	{/if}
</div>

{#each sections as section (section.id)}
	<FormModal bind:open={editors[section.id].open} title={$t(section.title)} submitLabel={$t('common.save')} cancelLabel={$t('common.cancel')} {busy} submitDisabled={!hasAnyPermission(['SCHOOL_LIFECYCLE_MANAGE']) || section.fields.some(key => ['name', 'shortName', 'timeZone'].includes(key) && !draft[key]?.trim()) || (section.id === 'location' && !!draft.financeCurrency && !/^[A-Z]{3}$/i.test(draft.financeCurrency))} onSubmit={() => save(section)}>
		<PermissionGate permission="SCHOOL_LIFECYCLE_MANAGE" mode="disable">{#snippet children({ disabled })}<fieldset {disabled} class="space-y-4">
			{#each section.fields as key (key)}<label class="block space-y-1.5 text-sm"><span>{$t(`schoolSettings.${key}`)}</span><Input bind:value={() => draft[key] ?? '', value => draft[key] = value} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} required={['name', 'shortName', 'timeZone'].includes(key)} />{#if key === 'financeCurrency'}<span class="block text-xs text-muted-foreground">{$t('schoolSettings.currencyHint')}</span>{/if}</label>{/each}
		</fieldset>{/snippet}</PermissionGate>
	</FormModal>
{/each}
<FormModal bind:open={assets.open} title={$t('schoolSettings.sectionIssuanceAssets')} description={$t('schoolSettings.assetsImmediate')} onSubmit={() => modals.close()} contentClass="max-w-2xl">
	{#if school}<PermissionGate permission="SCHOOL_LIFECYCLE_MANAGE" mode="disable">{#snippet children({ disabled })}<div class="space-y-5">
		<p class="text-sm text-muted-foreground">{$t('schoolSettings.assetPublicHint')}</p>
		{#each assetSlots as asset (asset.purpose)}<IssuanceAssetSlot purpose={asset.purpose} label={$t(`schoolSettings.asset.${asset.key}`)} attachmentId={school[asset.slot]} publicAllowed={(school.publicBrandingPurposes ?? []).includes(asset.purpose as 'school.logo' | 'school.crest')} canPublish={asset.public} canManage={!disabled} busy={assetBusy !== null} onUpload={file => upload(asset.purpose, file)} onClear={() => clear(asset.purpose)} onPublicChange={next => publishAsset(asset.purpose, next)} />{/each}
	</div>{/snippet}</PermissionGate>{/if}
	{#snippet footer({ close })}<Button onclick={close} disabled={assetBusy !== null}>{$t('common.done')}</Button>{/snippet}
</FormModal>
