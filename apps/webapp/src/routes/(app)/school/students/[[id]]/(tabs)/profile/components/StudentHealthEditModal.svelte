<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { mapHealthProfiles } from '$lib/api/student-360-data';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { onMount, untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { getStudentProfileTabState } from '../student-profile-tab.svelte';

	let { s, open = $bindable(false) }: {
		s: Student;
		open?: boolean;
	} = $props();
	const uid = $props.id();
	const profileTab = getStudentProfileTabState();
	const captured = untrack(() => profileTab.identity(s.id));
	const health = $derived(profileTab.healthFor(s.id));
	let busy = $state(false);
	let bloodType = $state('');
	let allergiesText = $state('');
	let medicationsText = $state('');
	let conditionsText = $state('');
	function resetForm() {
		bloodType = health?.bloodType === '—' ? '' : (health?.bloodType ?? '');
		allergiesText = health?.allergiesText ?? health?.allergies?.join(', ') ?? '';
		medicationsText = health?.medicationsText ?? health?.medications?.join(', ') ?? '';
		conditionsText = health?.medicalConditionsText ?? health?.chronicConditions?.join(', ') ?? '';
	}
	onMount(resetForm);
	async function submit() {
		if (busy || captured !== profileTab.identity(s.id)) {
			return;
		}
		busy = true;
		try {
			const saved = await profileTab.performUpsertStudentHealthProfile({
				id: health?.id,
				studentId: s.id,
				bloodType: bloodType.trim() || null,
				allergies: allergiesText.trim() || null,
				medications: medicationsText.trim() || null,
				medicalConditions: conditionsText.trim() || null,
				clinicalNotes: health?.notes || null,
				lastVisit: health?.lastVisit || null,
				emergencyProtocols: health?.emergencyProtocols || null,
				successMessage: get(t)('student.healthSaved'),
			});
			if (!saved || captured !== profileTab.identity(s.id)) {
				return;
			}
			profileTab.seed(s.id, { health: mapHealthProfiles([saved])[s.id] });
			open = false;
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	contentClass="max-w-3xl"
	bodyClass="ui-student-health-form"
	title={$t('student.editHealth')}
	submitLabel={$t('common.save')}
	cancelLabel={$t('common.cancel')}
	{busy}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="ui-student-health-fields grid gap-3">
		<div class="space-y-1.5">
			<Label for={`${uid}-bloodType`}>{$t('student.bloodType')}</Label>
			<Input id={`${uid}-bloodType`} bind:value={bloodType} />
		</div>
		<div class="space-y-1.5">
			<Label for={`${uid}-allergiesText`}>{$t('student.allergies')}</Label>
			<Textarea id={`${uid}-allergiesText`} bind:value={allergiesText} rows={3} />
		</div>
		<div class="space-y-1.5">
			<Label for={`${uid}-medicationsText`}>{$t('student.medications')}</Label>
			<Textarea id={`${uid}-medicationsText`} bind:value={medicationsText} rows={3} />
		</div>
		<div class="space-y-1.5">
			<Label for={`${uid}-conditionsText`}>{$t('student.conditions')}</Label>
			<Textarea id={`${uid}-conditionsText`} bind:value={conditionsText} rows={3} />
		</div>
	</div>
</FormModal>
