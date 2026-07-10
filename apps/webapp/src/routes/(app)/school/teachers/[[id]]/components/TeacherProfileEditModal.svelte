<script lang="ts">
	import type { Teacher } from '$lib/types/school';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getTeachersPageState } from '../../teachers-page.svelte';

	let {
		teacher,
		disabled = false,
		title,
		open = $bindable(false),
	}: {
		teacher: Teacher;
		disabled?: boolean;
		title?: string;
		open?: boolean;
	} = $props();

	const teachersPage = getTeachersPageState();

	let busy = $state(false);
	let wasOpen = $state(false);
	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let phone = $state('');

	function resetForm() {
		const parts = teacher.name.trim().split(/\s+/);
		firstName = parts.shift() ?? '';
		lastName = parts.join(' ');
		email = teacher.email;
		phone = teacher.phone;
	}

	$effect(() => {
		if (open && !wasOpen) {
			resetForm();
		}
		wasOpen = open;
	});

	const canSubmit = $derived(firstName.trim().length > 0 && lastName.trim().length > 0);

	async function submit() {
		if (!canSubmit) {
			return;
		}

		busy = true;
		const ok = await teachersPage.updateProfile({
			teacherId: teacher.id,
			firstName,
			lastName,
			email,
			phone,
			successMessage: get(t)('teacher.updateSuccess', {
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
	{$t('teacher.editProfile')}
</Button>

<FormModal
	bind:open
	title={$t('teacher.editProfileTitle', { name: teacher.name })}
	description={$t('teacher.editProfileDescription')}
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
			{$t('common.phone')}
		</Label>
		<Input type="tel" bind:value={phone} autocomplete="tel" />
	</div>
</FormModal>
