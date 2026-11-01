<script lang="ts">
	import type { Student } from '$lib/types/school';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { formatDateInput } from '$lib/date/format';
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
	let notesText = $state('');
	let emergencyProtocols = $state('');
	let lastVisit = $state('');
	function resetForm() {
		bloodType = health?.bloodType === '—' ? '' : (health?.bloodType ?? '');
		allergiesText = health?.allergiesText ?? health?.allergies?.join(', ') ?? '';
		medicationsText = health?.medicationsText ?? health?.medications?.join(', ') ?? '';
		conditionsText = health?.medicalConditionsText ?? health?.chronicConditions?.join(', ') ?? '';
		notesText = health?.notes ?? '';
		emergencyProtocols = health?.emergencyProtocols ?? '';
		lastVisit = health?.lastVisit?.slice(0, 10) ?? '';
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
				clinicalNotes: notesText.trim() || null,
				lastVisit: lastVisit || null,
				emergencyProtocols: emergencyProtocols.trim() || null,
				successMessage: get(t)('student.healthSaved'),
			});
			if (!saved || captured !== profileTab.identity(s.id)) {
				return;
			}
			profileTab.seed(s.id, {
				health: {
					id: saved.id,
					medicalConditionsText: saved.medicalConditions ?? '',
					allergiesText: saved.allergies ?? '',
					medicationsText: saved.medications ?? '',
					studentId: s.id,
					bloodType: (saved.bloodType ?? bloodType.trim()) || '—',
					allergies: allergiesText.split(',').map(value => value.trim()).filter(Boolean),
					medications: medicationsText.split(',').map(value => value.trim()).filter(Boolean),
					chronicConditions: conditionsText
						.split(',')
						.map(value => value.trim())
						.filter(Boolean),
					lastVisit: formatDateInput(saved.lastVisit),
					emergencyProtocols: saved.emergencyProtocols ?? '',
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
	<div class="space-y-1.5">
		<Label for={`${uid}-notesText`}>{$t('student.healthNotes')}</Label>
		<Textarea id={`${uid}-notesText`} bind:value={notesText} rows={3} />
	</div>
	<div class="space-y-1.5"><Label for={`${uid}-emergencyProtocols`}>{$t('profile.emergencyProtocols')}</Label><Textarea id={`${uid}-emergencyProtocols`} bind:value={emergencyProtocols} rows={3} /></div>
	<div class="space-y-1.5"><Label for={`${uid}-lastVisit`}>{$t('profile.lastVisit')}</Label><Input id={`${uid}-lastVisit`} type="date" bind:value={lastVisit} /></div>
</FormModal>
