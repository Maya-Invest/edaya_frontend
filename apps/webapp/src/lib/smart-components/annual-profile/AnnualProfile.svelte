<script lang="ts">
	import type { components } from '$lib/api/schema';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import { t } from '$lib/i18n';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { hasAnyPermission } from '$lib/permissions';
	import { AnnualProfileState } from './annual-profile-state.svelte';

	const { kind, personId, classId, name }: {
		kind: 'student' | 'teacher';
		personId: string;
		classId?: string;
		name: string;
	} = $props();
	const profileState = $derived(new AnnualProfileState(kind, () => personId));
	const modals = createUrlSyncedModals({ allowed: ['edit-annual-profile', 'remove-annual-profile'], getUrl: () => $page.url });
	const edit = bindUrlModal(modals, 'edit-annual-profile');
	const remove = bindUrlModal(modals, 'remove-annual-profile');
	const canRead = $derived(kind === 'student' ? hasAnyPermission(['STUDENT_READ'], { classId, studentId: personId }) : hasAnyPermission(['STAFF_READ', 'ACCESS_CONTROL_READ']));
	const canManage = $derived(kind === 'student' ? hasAnyPermission(['STUDENT_MANAGE'], { classId, studentId: personId }) : hasAnyPermission(['ACCESS_CONTROL_MANAGE']));
	const yearLabel = $derived(academicContext.years.find(year => year.id === academicContext.yearId)?.label ?? '');
	let openedIdentity = $state('');
	let openedYear = $state('');
	let openedPerson = $state('');
	let initialized = $state(false);
	let removeIdentity = $state('');
	let removeInitialized = $state(false);
	$effect(() => {
		if (remove.open && !removeInitialized) {
			removeIdentity = profileState.identity();
			removeInitialized = true;
		}
		if (!remove.open)
			removeInitialized = false;
	});
	let placementStatusId = $state('');
	let repeating = $state('unknown');
	let disciplineIds = $state<string[]>([]);
	let hours = $state('');
	let hoursPeriod = $state<components['schemas']['TeacherAcademicYearProfile']['hoursPeriod']>('unspecified');
	let periodLabel = $state('');
	const periodOptions = ['unspecified', 'week', 'month', 'term', 'academic_year', 'other'] as const;
	$effect(() => modals.hydrate());
	$effect(() => {
		if (edit.open && !initialized) {
			initialized = true;
			openedIdentity = profileState.identity();
			openedPerson = personId;
			openedYear = academicContext.yearId ?? '';
			placementStatusId = profileState.student?.placementStatusId ?? '';
			repeating = profileState.student?.isRepeating == null ? 'unknown' : String(profileState.student.isRepeating);
			disciplineIds = [...(profileState.teacher?.disciplineIds ?? [])];
			hours = profileState.teacher?.declaredHours == null ? '' : String(profileState.teacher.declaredHours);
			hoursPeriod = profileState.teacher?.hoursPeriod ?? 'unspecified';
			periodLabel = profileState.teacher?.hoursPeriodLabel ?? '';
		}
		if (!edit.open)
			initialized = false;
	});
	const stale = $derived(edit.open && openedIdentity !== profileState.identity());
	async function save() {
		if (!canManage || stale || profileState.loadedIdentity !== profileState.identity())
			return;
		if (await profileState.save({ personId: openedPerson, academicYearId: openedYear, placementStatusId: placementStatusId || null, isRepeating: repeating === 'unknown' ? null : repeating === 'true', disciplineIds, declaredHours: hours === '' ? null : Number(hours), hoursPeriod, hoursPeriodLabel: hoursPeriod === 'other' ? periodLabel.trim() || null : null }))
			modals.close();
	}
	async function removeProfile() {
		if (canManage && removeIdentity === profileState.identity() && await profileState.remove())
			modals.close();
	}
</script>
{#if canRead && academicContext.yearId}
	<section class="space-y-3 rounded-collection border border-border p-4">
		<div class="flex flex-wrap items-center justify-between gap-2"><h3 class="text-sm font-semibold">{$t('profile.yearInformation')} · {yearLabel}</h3>{#if canManage}<div class="flex gap-2"><Button variant="outline" size="sm" onclick={() => modals.open('edit-annual-profile')}>{$t('common.edit')}</Button>{#if profileState.student || profileState.teacher}<Button variant="ghost" size="sm" onclick={() => modals.open('remove-annual-profile')}>{$t('common.delete')}</Button>{/if}</div>{/if}</div>
		<PageQuery cache={false} query={profileState.query} cacheKey={() => profileState.identity()} loadingTitle={$t('profile.yearInformation')}>
			{#snippet children(data)}<DataState status={data.status} errorMessage={data.errorMessage} preserveShell>
				{#if kind === 'student'}
					<p class="text-sm">{$t('profile.placementStatuses')}: {profileState.options.find(option => option.id === profileState.student?.placementStatusId)?.label ?? $t('profile.notProvided')}</p>
					<p class="text-sm">{$t('profile.repeating')}: {profileState.student?.isRepeating == null ? $t('profile.notProvided') : $t(profileState.student.isRepeating ? 'common.yes' : 'common.no')}</p>
				{:else}
					<p class="text-sm">{$t('profile.academicDisciplines')}: {profileState.teacher?.disciplineIds.map(id => profileState.options.find(option => option.id === id)?.label ?? id).join(', ') || $t('profile.notProvided')}</p>
					<p class="text-sm">{$t('profile.declaredHours')}: {profileState.teacher?.declaredHours ?? $t('profile.notProvided')} · {$t(`profile.period.${profileState.teacher?.hoursPeriod ?? 'unspecified'}`)} {profileState.teacher?.hoursPeriodLabel ?? ''}</p>
				{/if}
			</DataState>{/snippet}
		</PageQuery>
	</section>
	<FormModal bind:open={edit.open} title={`${$t('profile.yearInformation')} · ${name} · ${yearLabel}`} submitLabel={$t('common.save')} busy={profileState.busy} submitDisabled={!canManage || stale || profileState.loadedIdentity !== profileState.identity() || (kind === 'teacher' && ((hours !== '' && (!Number.isFinite(Number(hours)) || Number(hours) < 0)) || (hoursPeriod === 'other' && !periodLabel.trim())))} onSubmit={save}>
		{#if stale}<p role="alert">{$t('profile.contextChanged')}</p>{/if}
		{#if kind === 'student'}
			<Label class="block space-y-2"><span>{$t('profile.placementStatuses')}</span><SelectField class="w-full border border-border bg-card" bind:value={placementStatusId}><option value="">{$t('profile.notProvided')}</option>{#each profileState.options.filter(option => option.isActive || option.id === profileState.student?.placementStatusId) as option (option.id)}<option value={option.id}>{option.code} · {option.label}{option.isActive ? '' : ` (${$t('teacher.statusInactive')})`}</option>{/each}</SelectField></Label>
			<Label class="block space-y-2"><span>{$t('profile.repeating')}</span><SelectField class="w-full border border-border bg-card" bind:value={repeating}><option value="unknown">{$t('profile.notProvided')}</option><option value="true">{$t('common.yes')}</option><option value="false">{$t('common.no')}</option></SelectField></Label>
		{:else}
			<fieldset class="space-y-2"><legend class="mb-2 text-sm font-medium">{$t('profile.academicDisciplines')}</legend>{#each profileState.options.filter(option => option.isActive || profileState.teacher?.disciplineIds.includes(option.id)) as option (option.id)}<Label class="flex items-center gap-2"><Checkbox checked={disciplineIds.includes(option.id)} onCheckedChange={checked => disciplineIds = checked ? [...disciplineIds, option.id] : disciplineIds.filter(id => id !== option.id)} />{option.code} · {option.label}</Label>{/each}</fieldset>
			<Label class="block space-y-2"><span>{$t('profile.declaredHours')}</span><Input type="number" min="0" step="any" bind:value={hours} /></Label>
			<Label class="block space-y-2"><span>{$t('profile.hoursPeriod')}</span><SelectField class="w-full border border-border bg-card" bind:value={hoursPeriod}>{#each periodOptions as option (option)}<option value={option}>{$t(`profile.period.${option}`)}</option>{/each}</SelectField></Label>
			{#if hoursPeriod === 'other'}<Label class="block space-y-2"><span>{$t('profile.periodLabel')}</span><Input bind:value={periodLabel} /></Label>{/if}
		{/if}
	</FormModal>
	<ConfirmModal bind:open={remove.open} title={$t('common.delete')} description={`${name} · ${yearLabel}`} busy={profileState.busy} confirmDisabled={!canManage || removeIdentity !== profileState.identity()} onConfirm={removeProfile} />
{/if}
