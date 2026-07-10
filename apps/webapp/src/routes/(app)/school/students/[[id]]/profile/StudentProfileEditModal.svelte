<script lang="ts">
	import type { Student } from '$lib/types/school';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { formatDateInput } from '$lib/date/format';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getStudentsPageState } from '../../students-page.svelte';

	let {
		s,
		disabled = false,
		title,
		open = $bindable(false),
	}: {
		s: Student;
		disabled?: boolean;
		title?: string;
		open?: boolean;
	} = $props();

	let busy = $state(false);
	let wasOpen = $state(false);
	let firstName = $state('');
	let lastName = $state('');
	let birthDate = $state('');

	function resetForm() {
		const parts = s.name.trim().split(/\s+/);
		firstName = parts.shift() ?? '';
		lastName = parts.join(' ');
		birthDate = formatDateInput(s.birthdate);
	}

	$effect(() => {
		if (open && !wasOpen)
			resetForm();
		wasOpen = open;
	});

	const canSubmit = $derived(firstName.trim().length > 0 && lastName.trim().length > 0);

	const studentsPage = getStudentsPageState();

	async function submit() {
		if (!canSubmit)
			return;

		busy = true;
		const ok = await studentsPage.updateProfile({
			studentId: s.id,
			firstName,
			lastName,
			birthDate,
			successMessage: get(t)('student.updateSuccess', {
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
	{$t('student.editProfile')}
</Button>

<FormModal
	bind:open
	title={$t('student.editProfileTitle', { name: s.name })}
	description={$t('student.editProfileDescription')}
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
			{$t('drawer.birthDate')}
		</Label>
		<Input type="date" bind:value={birthDate} />
	</div>
</FormModal>
