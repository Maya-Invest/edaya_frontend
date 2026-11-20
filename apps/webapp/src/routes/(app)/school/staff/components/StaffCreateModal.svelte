<script lang="ts">
	import type { UserScopeSelection } from '$lib/api/grant-scopes';
	import type { StaffProfileRole } from '$lib/staff/staff-profile-roles';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { permissionSelectionGrains, requiresSubjectClass, scopeSelectionsComplete } from '$lib/api/grant-scopes';
	import { authSession } from '$lib/auth/session.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import IdentifierInput from '$lib/smart-components/human-identifier/IdentifierInput.svelte';
	import PermissionScopeSelections from '$lib/smart-components/scope-builder/PermissionScopeSelections.svelte';
	import {
		DEFAULT_STAFF_PROFILE_ROLE,
		isStaffProfileRole,
		SELECTABLE_STAFF_PROFILE_ROLES,

	} from '$lib/staff/staff-profile-roles';
	import { get } from 'svelte/store';
	import { getStaffPageState } from '../staff-page.svelte';

	let {
		open = $bindable(false),
	}: {
		open?: boolean;
	} = $props();

	const staffPage = getStaffPageState();

	let busy = $state(false);
	let firstName = $state('');
	let lastName = $state('');
	let profileRole = $state<StaffProfileRole>(DEFAULT_STAFF_PROFILE_ROLE);
	let additional = $state<Record<string, string>>({});
	let email = $state('');
	let phone = $state('');
	let sendAccountInvitation = $state(true);
	const formData = staffPage.creationPermissionData;
	const schoolId = $derived(authSession.schoolId ?? academicContext.schools[0]?.id ?? '');
	const permissionProfiles = $derived(formData.data?.profiles ?? []);
	let permissionProfileId = $state('');
	let customScopes = $state<UserScopeSelection[]>([]);
	let useDefaultScopes = $state(true);
	const selectedProfile = $derived(permissionProfiles.find(row => row.id === permissionProfileId));
	const subjectClassRequired = $derived(requiresSubjectClass((formData.data?.catalog ?? []).filter(entry => selectedProfile?.permissions.includes(entry.permission))));
	const scopeGrains = $derived([...new Set((formData.data?.catalog ?? []).filter(entry => selectedProfile?.permissions.includes(entry.permission)).flatMap(permissionSelectionGrains))]);

	function resetForm() {
		firstName = '';
		lastName = '';
		profileRole = DEFAULT_STAFF_PROFILE_ROLE;
		additional = {};
		email = '';
		phone = '';
		sendAccountInvitation = true;
		permissionProfileId = '';
		customScopes = [];
		useDefaultScopes = true;
	}

	$effect(() => {
		resetForm();
		if (open)
			void formData.load(schoolId);
		else formData.reset();
		return () => formData.reset();
	});

	const canSubmit = $derived(
		firstName.trim().length > 0 && lastName.trim().length > 0 && Boolean(profileRole) && scopeSelectionsComplete(customScopes, subjectClassRequired) && (!permissionProfileId || Boolean(formData.data && selectedProfile)),
	);

	async function submit() {
		if (!canSubmit) {
			return;
		}

		busy = true;
		const fullName = `${firstName.trim()} ${lastName.trim()}`;
		const staffId = await staffPage.createStaff({
			firstName,
			lastName,
			profile: additional,
			email,
			phone,
			profileRole,
			sendAccountInvitation,
			permissionProfileId: permissionProfileId || undefined,
			customScopes,
			useDefaultScopes: scopeGrains.length > 0 && useDefaultScopes,
			successMessage: get(t)('staff.createSuccess', { name: fullName }),
		});
		busy = false;
		if (staffId) {
			open = false;
			resetForm();
			openDetailDrawer(detailHref.configStaffMember(staffId), currentRouteSurfaceHref($page.url));
		}
	}
</script>

<FormModal
	bind:open
	title={$t('staff.createTitle')}
	description={$t('staff.createDescription')}
	submitLabel={$t('common.save')}
	{busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<IdentifierInput bind:profile={additional} />
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('common.firstName')}
			</Label>
			<Input bind:value={firstName} autocomplete="given-name" aria-label={$t('common.firstName')} />
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('common.lastName')}
			</Label>
			<Input bind:value={lastName} autocomplete="family-name" aria-label={$t('common.lastName')} />
		</div>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('people.role')}
		</Label>
		<Select.Root
			type="single"
			value={profileRole}
			onValueChange={(value) => {
				if (isStaffProfileRole(value)) {
					profileRole = value;
				}
			}}
		>
			<Select.Trigger class="w-full">
				<Select.Value>
					{$t(`staff.role.${profileRole}`)}
				</Select.Value>
			</Select.Trigger>
			<Select.Content class="z-[100]">
				{#each SELECTABLE_STAFF_PROFILE_ROLES as profile (profile.value)}
					<Select.Item value={profile.value} label={$t(profile.labelKey)}>
						{$t(profile.labelKey)}
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('staff.permissionProfileOptional')}
		</Label>
		<SelectField
			disabled={formData.loading || !formData.data}
			bind:value={permissionProfileId}
			onchange={() => customScopes = []}
			class="h-10 w-full rounded-collection border border-border bg-background px-3 text-sm"
		>
			<option value="">{$t('staff.noPermissionProfile')}</option>
			{#each permissionProfiles as profile (profile.id)}
				<option value={profile.id}>{profile.name}</option>
			{/each}
		</SelectField>
	</div>
	{#if formData.loading}<p role="status" class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>{/if}
	{#if formData.error}
		<p role="alert" class="text-sm text-destructive">{$t('dataState.errorDefault')}</p>
		<button type="button" class="text-sm text-primary" onclick={() => formData.load(schoolId)}>{$t('dataState.retry')}</button>
	{/if}
	{#if selectedProfile}
		{#if scopeGrains.length}
			<label class="flex items-center gap-2 text-sm"><Checkbox bind:checked={useDefaultScopes} />{$t('staff.includeDefaultScopes')}</label>
			<p class="text-xs text-muted-foreground">{$t('staff.defaultScopeAdditiveHint')}</p>
			<p class="text-xs text-highlight">{$t('staff.noDefaultScopes')}</p>
			<Label>{$t('staff.customScopes')}</Label>
			<PermissionScopeSelections {subjectClassRequired} bind:scopes={customScopes} grains={scopeGrains} active={open} />
		{/if}
	{/if}
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('common.email')}
		</Label>
		<Input type="email" bind:value={email} autocomplete="email" aria-label={$t('common.email')} />
		<Label>{$t('common.phone')}</Label>
		<Input type="tel" bind:value={phone} autocomplete="tel" aria-label={$t('common.phone')} />
	</div>
	<div class="flex items-start gap-3 rounded-collection border border-border bg-secondary/30 px-3 py-2.5">
		<Checkbox bind:checked={sendAccountInvitation} id="staff-send-invite" />
		<div class="space-y-1">
			<Label for="staff-send-invite" class="text-sm font-medium">
				{$t('invitation.createModal.sendInvite')}
			</Label>
			<p class="text-xs text-muted-foreground">{$t('invitation.createModal.sendInviteHint')}</p>
		</div>
	</div>
</FormModal>
