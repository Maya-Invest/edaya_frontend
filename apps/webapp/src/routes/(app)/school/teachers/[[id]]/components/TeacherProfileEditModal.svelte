<script lang="ts">
	import type { Teacher } from '$lib/types/school';
	import PersonProfileFields from '$lib/components/school/shared/PersonProfileFields.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { personFieldDraft } from '$lib/people-profile-fields';
	import { get } from 'svelte/store';
	import { getTeachersPageState } from '../../teachers-page.svelte';

	let { teacher, disabled = false, title, open = $bindable(false) }: {
		teacher: Teacher;
		disabled?: boolean;
		title?: string;
		open?: boolean;
	} = $props();
	const teachersPage = getTeachersPageState();
	let busy = $state(false);
	let wasOpen = $state(false);
	let additional = $state<Record<string, string>>({});
	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let phone = $state('');
	function resetForm() {
		additional = personFieldDraft('teacher', teacher);
		firstName = teacher.firstName ?? '';
		lastName = teacher.lastName ?? '';
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
			profile: additional,
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

<Button variant="outline" size="sm" {disabled} {title} onclick={() => (open = true)}>
	{$t('teacher.editProfile')}
</Button>

<FormModal contentClass="max-w-3xl"
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
			{$t('common.email')}
		</Label>
		<Input type="email" bind:value={email} autocomplete="email" aria-label={$t('common.email')} />
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('common.phone')}
		</Label>
		<Input type="tel" bind:value={phone} autocomplete="tel" aria-label={$t('common.phone')} />
	</div>
	<PersonProfileFields kind="teacher" entityId={teacher.id} bind:values={additional} />
</FormModal>
