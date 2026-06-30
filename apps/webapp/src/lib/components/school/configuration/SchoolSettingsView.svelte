<script lang="ts">
	import type { SchoolRaw } from '$lib/api/school-data';
	import type { SchoolSettingsPageData } from '$lib/queries/school.queries';
	import type { School, SchoolType } from '$lib/types/school';
	import { updateSchoolSettingsMutation } from '$lib/api/mutations/school.mutations';
	import { DEFAULT_SCHOOL_TIMEZONE } from '$lib/api/school-data';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { Building2, Pencil } from '$lib/icons';
	import { get } from 'svelte/store';

	const SCHOOL_TYPES: SchoolType[] = ['primary', 'secondary', 'k12', 'vocational', 'other'];

	const {
		data,
	}: {
		data: SchoolSettingsPageData;
	} = $props();

	let saved = $state<{ school: School; raw: SchoolRaw } | null>(null);
	const school = $derived(saved?.school ?? data.school);
	const raw = $derived(saved?.raw ?? data.raw);
	let editOpen = $state(false);
	let busy = $state(false);
	let name = $state('');
	let timeZone = $state('');
	let city = $state('');
	let country = $state('');
	let type = $state<SchoolType | ''>('');

	const readOnlyFieldClass = 'min-h-10 rounded-md border border-input bg-card px-3 py-2 text-sm';

	function schoolTypeLabel(value: SchoolType | null | undefined): string {
		if (!value) {
			return '—';
		}
		return get(t)(`schoolSettings.type.${value}`);
	}

	function hydrateForm() {
		if (!school) {
			return;
		}
		name = school.name;
		timeZone = school.timeZone;
		city = school.city;
		country = school.country ?? '';
		type = school.type ?? '';
	}

	$effect(() => {
		if (editOpen) {
			hydrateForm();
		}
	});

	const canSubmit = $derived(name.trim().length > 0 && timeZone.trim().length > 0);

	const typeLabel = $derived(type ? get(t)(`schoolSettings.type.${type}`) : '');

	async function submit() {
		if (!school || !canSubmit || busy) {
			return;
		}
		busy = true;
		const next = await updateSchoolSettingsMutation({
			id: school.id,
			name,
			timeZone,
			city: city.trim() || null,
			country: country.trim() || null,
			type: type || null,
		}, {
			current: raw,
			successMessage: get(t)('schoolSettings.toastSaved'),
		});
		busy = false;
		if (next) {
			saved = next;
			editOpen = false;
		}
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('schoolSettings.eyebrow')}
		title={$t('schoolSettings.title')}
	>
		{#snippet primary()}
			<PermissionGate permission="SCHOOL_LIFECYCLE_MANAGE" mode="disable" tooltip={$t('schoolSettings.permissionEdit')}>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => (editOpen = true)}
					>
						<Pencil class="mr-1 h-4 w-4" />
						{$t('common.edit')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</ListPageHeader>

	{#if school}
		<div class="mx-auto max-w-2xl space-y-6">
			<div class="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
				<div
					class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
				>
					<Building2 class="h-8 w-8" />
				</div>
				<div class="min-w-0">
					<h2 class="font-display text-xl font-semibold leading-tight">{school.name}</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						{$t('schoolSettings.shortNameDerived', { name: school.shortName })}
					</p>
				</div>
			</div>

			<section class="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
				<h3 class="font-display text-lg font-semibold">{$t('schoolSettings.sectionIdentity')}</h3>
				<DrawerField label={$t('schoolSettings.name')}>
					<div class={readOnlyFieldClass}>{school.name}</div>
				</DrawerField>
				<DrawerField label={$t('schoolSettings.shortName')}>
					<div class={readOnlyFieldClass}>{school.shortName}</div>
				</DrawerField>
				<DrawerField label={$t('schoolSettings.type')}>
					<div class={readOnlyFieldClass}>{schoolTypeLabel(school.type)}</div>
				</DrawerField>
			</section>

			<section class="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
				<h3 class="font-display text-lg font-semibold">{$t('schoolSettings.sectionLocation')}</h3>
				<DrawerField label={$t('schoolSettings.city')}>
					<div class={readOnlyFieldClass}>{school.city || '—'}</div>
				</DrawerField>
				<DrawerField label={$t('schoolSettings.country')}>
					<div class={readOnlyFieldClass}>{school.country || '—'}</div>
				</DrawerField>
				<DrawerField label={$t('schoolSettings.timeZone')}>
					<div class={readOnlyFieldClass}>{school.timeZone}</div>
				</DrawerField>
			</section>
		</div>
	{/if}
</div>

<FormModal
	bind:open={editOpen}
	title={$t('schoolSettings.editTitle')}
	description={$t('schoolSettings.editDescription')}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={hydrateForm}
	onSubmit={submit}
>
	<div class="space-y-4">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('schoolSettings.name')}
			</Label>
			<Input bind:value={name} />
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('schoolSettings.type')}
			</Label>
			<Select.Root type="single" value={type || undefined} onValueChange={v => v && (type = v as SchoolType)}>
				<Select.Trigger>
					<Select.Value placeholder={$t('schoolSettings.typePlaceholder')}>
						{typeLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each SCHOOL_TYPES as schoolType (schoolType)}
						<Select.Item value={schoolType} label={$t(`schoolSettings.type.${schoolType}`)}>
							{$t(`schoolSettings.type.${schoolType}`)}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<div class="space-y-1.5">
				<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('schoolSettings.city')}
				</Label>
				<Input bind:value={city} />
			</div>
			<div class="space-y-1.5">
				<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('schoolSettings.country')}
				</Label>
				<Input bind:value={country} />
			</div>
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('schoolSettings.timeZone')}
			</Label>
			<Input bind:value={timeZone} placeholder={DEFAULT_SCHOOL_TIMEZONE} />
			<p class="text-xs text-muted-foreground">{$t('schoolSettings.timeZoneHint')}</p>
		</div>
	</div>
</FormModal>
