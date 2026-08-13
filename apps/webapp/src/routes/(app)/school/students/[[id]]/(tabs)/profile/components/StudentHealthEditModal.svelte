<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { upsertStudentHealthProfileMutation } from '$lib/api/mutations/student-ops.mutations';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { getStudentProfileTabState } from '../student-profile-tab.svelte';

	let {
		s,
		open = $bindable(false),
	}: {
		s: Student;
		open?: boolean;
	} = $props();

	const profileTab = getStudentProfileTabState();
	const health = $derived(profileTab.healthFor(s.id));

	let busy = $state(false);
	let bloodType = $state('');
	let allergiesText = $state('');
	let medicationsText = $state('');
	let conditionsText = $state('');
	let notesText = $state('');

	function resetForm() {
		bloodType = health?.bloodType === '—' ? '' : (health?.bloodType ?? '');
		allergiesText = health?.allergies?.join(', ') ?? '';
		medicationsText = health?.medications?.join(', ') ?? '';
		conditionsText = health?.chronicConditions?.join(', ') ?? '';
		notesText = health?.notes ?? '';
	}

	onMount(resetForm);

	async function submit() {
		if (busy) {
			return;
		}
		busy = true;
		try {
			const saved = await upsertStudentHealthProfileMutation({
				id: health?.id,
				studentId: s.id,
				bloodType: bloodType.trim() || null,
				allergies: allergiesText.trim() || null,
				medications: medicationsText.trim() || null,
				medicalConditions: conditionsText.trim() || null,
				clinicalNotes: notesText.trim() || null,
				lastVisit: health?.lastVisit || null,
				successMessage: get(t)('student.healthSaved'),
			});
			if (!saved) {
				return;
			}
			profileTab.seed(s.id, {
				health: {
					id: saved.id,
					studentId: s.id,
					bloodType: (saved.bloodType ?? bloodType.trim()) || '—',
					allergies: allergiesText.split(',').map(value => value.trim()).filter(Boolean),
					medications: medicationsText.split(',').map(value => value.trim()).filter(Boolean),
					chronicConditions: conditionsText
						.split(',')
						.map(value => value.trim())
						.filter((value): value is 'Asthme' | 'Epilepsie' | 'Diabete' =>
							value === 'Asthme' || value === 'Epilepsie' || value === 'Diabete'),
					lastVisit: health?.lastVisit ?? '',
					notes: notesText.trim(),
				},
			});
			open = false;
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={$t('student.editHealth')}
	submitLabel={$t('common.save')}
	cancelLabel={$t('common.cancel')}
	{busy}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label>{$t('student.bloodType')}</Label>
			<Input bind:value={bloodType} />
		</div>
		<div class="space-y-1.5">
			<Label>{$t('student.allergies')}</Label>
			<Input bind:value={allergiesText} />
		</div>
		<div class="space-y-1.5">
			<Label>{$t('student.medications')}</Label>
			<Input bind:value={medicationsText} />
		</div>
		<div class="space-y-1.5">
			<Label>{$t('student.conditions')}</Label>
			<Input bind:value={conditionsText} />
		</div>
	</div>
	<div class="space-y-1.5">
		<Label>{$t('student.healthNotes')}</Label>
		<Textarea bind:value={notesText} rows={3} />
	</div>
</FormModal>
