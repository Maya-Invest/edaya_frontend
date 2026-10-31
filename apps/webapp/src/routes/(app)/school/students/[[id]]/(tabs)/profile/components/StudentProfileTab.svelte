<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { page } from '$app/stores';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import PersonProfileDetails from '$lib/components/school/shared/PersonProfileDetails.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { formatLocaleDate } from '$lib/date/format';
	import { locale, t } from '$lib/i18n';
	import { getDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal } from '$lib/modal/modal-state.svelte';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { hasPermission } from '$lib/permissions';
	import AccountLinkingSection from '$lib/smart-components/account-linking/AccountLinkingSection.svelte';
	import { studentGenderLabelKey } from '$lib/students/format-student-gender';
	import { tick } from 'svelte';
	import { getStudentProfileTabState } from '../student-profile-tab.svelte';
	import StudentGuardiansSection from './StudentGuardiansSection.svelte';
	import StudentHealthEditModal from './StudentHealthEditModal.svelte';
	import StudentNotesSection from './StudentNotesSection.svelte';
	import StudentPortraitReviewCard from './StudentPortraitReviewCard.svelte';
	import StudentProfileSectionQuery from './StudentProfileSectionQuery.svelte';
	import StudentSchoolingSection from './StudentSchoolingSection.svelte';

	const { s }: { s: Student } = $props();
	const owner = getStudentProfileTabState();
	registerVersionInvalidation(owner);
	const health = $derived(owner.healthFor(s.id));
	const scope = $derived({ classId: $page.params.classId ?? s.classId, studentId: s.id });
	const readHealth = $derived(hasPermission('STUDENT_HEALTH_READ', scope));
	const editHealth = $derived(readHealth && hasPermission('STUDENT_HEALTH_UPDATE', scope));
	const modals = getDrawerUrlModals();
	const healthOpen = modals ? bindUrlModal(modals, 'edit-health') : null;
	let anchored = $state('');
	$effect(() => {
		const url = $page.url;
		const studentId = s.id;
		const key = `${url.pathname}${url.hash}`;
		const healthStatus = owner.statusFor('health', studentId)?.status;
		const portraitStatus = owner.statusFor('portrait', studentId)?.status;
		if (url.hash !== '#schooling' || url.searchParams.has('modal') || anchored === key || !portraitStatus || portraitStatus === 'loading' || (readHealth && (!healthStatus || healthStatus === 'loading')))
			return;
		let cancelled = false;
		void tick().then(async () => {
			await document.fonts.ready;
			await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
			if (!cancelled) {
				anchored = key;
				document.getElementById('schooling')?.scrollIntoView({ block: 'start' });
			}
		});
		return () => {
			cancelled = true;
		};
	});
</script>
<div class="ui-student-profile" data-testid="student-profile">
	<section aria-labelledby="student-portrait-heading" data-profile-section="portrait"><h3 id="student-portrait-heading">{$t('student.profile.portrait')}</h3><StudentProfileSectionQuery section="portrait"><StudentPortraitReviewCard {s} /></StudentProfileSectionQuery></section>
	{#if readHealth}<section aria-labelledby="student-health-heading" data-profile-section="health">
		<div class="ui-student-section-heading"><h3 id="student-health-heading">{$t('student.profile.health')}</h3>{#if editHealth && owner.statusFor('health', s.id)?.status === 'ready'}<Button variant="outline" onclick={() => modals?.open('edit-health')}>{$t('student.editHealth')}</Button>{/if}</div>
		<StudentProfileSectionQuery section="health">
			{#if health}<div class="ui-student-facts">
				<DrawerField label={$t('student.bloodType')}><p>{health.bloodType === '—' ? $t('profile.notProvided') : health.bloodType}</p></DrawerField>
				<DrawerField label={$t('student.allergies')}><p>{health.allergiesText || health.allergies.join(', ') || $t('profile.notProvided')}</p></DrawerField>
				<div class="ui-student-full-fact"><DrawerField label={$t('student.conditions')}><p>{health.medicalConditionsText || health.chronicConditions.join(', ') || $t('profile.notProvided')}</p></DrawerField></div>
				<DrawerField label={$t('student.medications')}><p>{health.medicationsText || health.medications.join(', ') || $t('profile.notProvided')}</p></DrawerField>
				<div class="ui-student-full-fact"><DrawerField label={$t('profile.emergencyProtocols')}><p>{health.emergencyProtocols || $t('profile.notProvided')}</p></DrawerField></div>
				<DrawerField label={$t('drawer.lastNurse')}><p>{health.lastVisit ? formatLocaleDate(health.lastVisit, $locale, { year: 'numeric', month: 'long', day: 'numeric' }) : $t('profile.notProvided')}</p></DrawerField>
				<div class="ui-student-full-fact"><DrawerField label={$t('student.healthNotes')}><p>{health.notes || $t('profile.notProvided')}</p></DrawerField></div>
			</div>{:else}<p class="text-sm text-muted-foreground">{$t('student.profile.noHealth')}</p>{/if}
			{#if healthOpen?.open && editHealth}<StudentHealthEditModal {s} bind:open={healthOpen.open} />{/if}
		</StudentProfileSectionQuery>
	</section>{/if}
	<section aria-labelledby="student-personal-heading" data-profile-section="personal"><h3 id="student-personal-heading">{$t('student.profile.personal')}</h3>
		<PersonProfileDetails kind="student" person={s} exclude={['matricule', 'nationalMatricule', 'enrollmentDate', 'gender']} />
		<div class="ui-student-facts"><DrawerField label={$t('drawer.birthDate')}><p>{s.birthdate ? formatLocaleDate(s.birthdate, $locale, { year: 'numeric', month: 'long', day: 'numeric' }) : $t('profile.notProvided')}</p></DrawerField><DrawerField label={$t('student.gender')}><p>{studentGenderLabelKey(s.gender) ? $t(studentGenderLabelKey(s.gender)!) : s.gender || $t('profile.notProvided')}</p></DrawerField><div class="ui-student-full-fact"><DrawerField label={$t('common.email')}><p>{s.email || $t('profile.notProvided')}</p></DrawerField></div></div>
	</section>
	<section id="schooling" aria-labelledby="student-schooling-heading" data-profile-section="schooling"><h3 id="student-schooling-heading">{$t('student.profile.schooling')}</h3><StudentSchoolingSection {s} /></section>
	{#if hasPermission('PARENT_READ', scope)}<section aria-label={$t('people.guardians')} data-profile-section="guardians"><StudentGuardiansSection {s} /></section>{/if}
	<section aria-labelledby="student-account-heading" data-profile-section="account"><h3 id="student-account-heading">{$t('student.profile.account')}</h3><AccountLinkingSection flat kind="student" targetId={s.id} subjectId={s.subjectId} contactEmail={s.email} displayName={s.name} /></section>
	<section aria-labelledby="student-notes-heading" data-profile-section="notes"><StudentNotesSection {s} /></section>
</div>
