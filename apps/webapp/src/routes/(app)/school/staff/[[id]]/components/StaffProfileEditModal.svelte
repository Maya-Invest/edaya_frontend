<script lang="ts">
	import type { StaffMember } from '$lib/types/school';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import {
		DEFAULT_STAFF_PROFILE_ROLE,
		isStaffProfileRole,
		SELECTABLE_STAFF_PROFILE_ROLES,
		type StaffProfileRole,
	} from '$lib/staff/staff-profile-roles';
	import { get } from 'svelte/store';
	import { getStaffPageState } from '../../staff-page.svelte';

	let {
		s,
		disabled = false,
		title,
		open = $bindable(false),
	}: {
		s: StaffMember;
		disabled?: boolean;
		title?: string;
		open?: boolean;
	} = $props();

	let busy = $state(false);
	let wasOpen = $state(false);
	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let profileRole = $state<StaffProfileRole>(DEFAULT_STAFF_PROFILE_ROLE);

	const staffPage = getStaffPageState();

	function resetForm() {
		const parts = s.name.trim().split(/\s+/);
		firstName = parts.shift() ?? '';
		lastName = parts.join(' ');
		email = s.email;
		profileRole = isStaffProfileRole(s.role) ? s.role : DEFAULT_STAFF_PROFILE_ROLE;
	}

	$effect(() => {
		if (open && !wasOpen)
			resetForm();
		wasOpen = open;
	});

	const canSubmit = $derived(
		firstName.trim().length > 0 && lastName.trim().length > 0 && Boolean(profileRole),
	);

	async function submit() {
		if (!canSubmit)
			return;

		busy = true;
		const ok = await staffPage.updateProfile({
			staffId: s.id,
			firstName,
			lastName,
			email,
			profileRole,
			successMessage: get(t)('staff.updateSuccess', {
				name: `${firstName.trim()} ${lastName.trim()}`,
			}),
		});
		busy = false;
		if (ok) {
			open = false;
		}
	}
</script>

<Button variant="outline" size="sm" class="rounded-full" {disabled} {title} onclick={() => (open = true)}>
	{$t('staff.editProfile')}
</Button>

<FormModal
	bind:open
	title={$t('staff.editProfileTitle', { name: s.name })}
	description={$t('staff.editProfileDescription')}
	submitLabel={$t('common.save')}
	busy={busy}
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
			{$t('common.email')}
		</Label>
		<Input type="email" bind:value={email} autocomplete="email" />
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
</FormModal>
