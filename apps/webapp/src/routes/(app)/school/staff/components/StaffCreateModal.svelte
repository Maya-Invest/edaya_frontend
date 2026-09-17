<script lang="ts">
	import type { StaffPermissionProfile } from '$lib/api/staff-permission-profiles-data';
	import type { StaffProfileRole } from '$lib/staff/staff-profile-roles';
	import { academicContext } from '$lib/academic/context.svelte';
	import { getBrowserSchoolClient } from '$lib/api/school-client';
	import {
		loadStaffPermissionProfiles,
		tenantWideProfiles,

	} from '$lib/api/staff-permission-profiles-data';
	import { authSession } from '$lib/auth/session.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
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
	let code = $state('');
	let email = $state('');
	let sendAccountInvitation = $state(true);
	let tenantProfiles = $state<StaffPermissionProfile[]>([]);
	let permissionProfileId = $state('');

	async function loadTenantProfiles() {
		const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
		if (!schoolId) {
			tenantProfiles = [];
			return;
		}
		const profiles = await loadStaffPermissionProfiles(getBrowserSchoolClient(), schoolId);
		tenantProfiles = tenantWideProfiles(profiles);
	}

	function resetForm() {
		firstName = '';
		lastName = '';
		profileRole = DEFAULT_STAFF_PROFILE_ROLE;
		code = '';
		email = '';
		sendAccountInvitation = true;
		permissionProfileId = '';
	}

	$effect(() => {
		if (open) {
			void loadTenantProfiles();
		}
	});

	const canSubmit = $derived(
		firstName.trim().length > 0 && lastName.trim().length > 0 && Boolean(profileRole),
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
			code,
			email,
			profileRole,
			sendAccountInvitation,
			permissionProfileId: permissionProfileId || undefined,
			successMessage: get(t)('staff.createSuccess', { name: fullName }),
		});
		busy = false;
		if (staffId) {
			open = false;
			resetForm();
			appGoto(detailHref.configStaffMember(staffId));
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
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('common.firstName')}
			</Label>
			<Input bind:value={firstName} autocomplete="given-name" />
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('common.lastName')}
			</Label>
			<Input bind:value={lastName} autocomplete="family-name" />
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
			{$t('staff.tenantWideProfileOptional')}
		</Label>
		<select
			bind:value={permissionProfileId}
			class="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
		>
			<option value="">{$t('staff.noTenantWideProfile')}</option>
			{#each tenantProfiles as profile (profile.id)}
				<option value={profile.id}>{profile.name}</option>
			{/each}
		</select>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('common.code')}
		</Label>
		<Input bind:value={code} />
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('common.email')}
		</Label>
		<Input type="email" bind:value={email} autocomplete="email" />
	</div>
	<div class="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
		<Checkbox bind:checked={sendAccountInvitation} id="staff-send-invite" />
		<div class="space-y-1">
			<Label for="staff-send-invite" class="text-sm font-medium">
				{$t('invitation.createModal.sendInvite')}
			</Label>
			<p class="text-xs text-muted-foreground">{$t('invitation.createModal.sendInviteHint')}</p>
		</div>
	</div>
</FormModal>
