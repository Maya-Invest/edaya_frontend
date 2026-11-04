<script lang="ts">
	import type { Student } from '$lib/types/school';
	import PersonProfileFields from '$lib/components/school/shared/PersonProfileFields.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { formatDateInput } from '$lib/date/format';
	import { t } from '$lib/i18n';
	import { personFieldDraft } from '$lib/people-profile-fields';
	import { get } from 'svelte/store';
	import { getStudentProfileTabState } from '../student-profile-tab.svelte';

	let { s, open = $bindable(false) }: {
		s: Student;
		open?: boolean;
	} = $props();
	let busy = $state(false);
	let wasOpen = $state(false);
	let additional = $state<Record<string, string>>({});
	let firstName = $state('');
	let lastName = $state('');
	let birthDate = $state('');
	function resetForm() {
		additional = personFieldDraft('student', s);
		firstName = s.firstName ?? '';
		lastName = s.lastName ?? '';
		birthDate = formatDateInput(s.birthdate);
	}
	$effect(() => {
		if (open && !wasOpen)
			resetForm();
		wasOpen = open;
	});
	const canSubmit = $derived(firstName.trim().length > 0 && lastName.trim().length > 0);
	const profileTab = getStudentProfileTabState();
	async function submit() {
		if (!canSubmit)
			return;
		busy = true;
		const ok = await profileTab.updateProfile({
			studentId: s.id,
			profile: additional,
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

<FormModal contentClass="max-w-3xl"
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
			{$t('drawer.birthDate')}
		</Label>
		<Input type="date" bind:value={birthDate} aria-label={$t('drawer.birthDate')} />
	</div>
	<PersonProfileFields kind="student" bind:values={additional} />
</FormModal>
