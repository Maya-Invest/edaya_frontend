<script lang="ts">
	import { page } from '$app/stores';
	import PersonProfileFields from '$lib/components/school/shared/PersonProfileFields.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { personFieldDraft } from '$lib/people-profile-fields';
	import { get } from 'svelte/store';
	import { getTeachersPageState } from '../teachers-page.svelte';

	let { open = $bindable(false) }: {
		open?: boolean;
	} = $props();
	const teachersPage = getTeachersPageState();
	let busy = $state(false);
	let additional = $state<Record<string, string>>(personFieldDraft('teacher'));
	let firstName = $state('');
	let lastName = $state('');
	let code = $state('');
	let email = $state('');
	let phone = $state('');
	let sendAccountInvitation = $state(true);
	function resetForm() {
		additional = personFieldDraft('teacher');
		firstName = '';
		lastName = '';
		code = '';
		email = '';
		phone = '';
		sendAccountInvitation = true;
	}
	const canSubmit = $derived(firstName.trim().length > 0 && lastName.trim().length > 0 && (!sendAccountInvitation || email.trim().length > 0));
	async function submit() {
		if (!canSubmit) {
			return;
		}
		busy = true;
		const fullName = `${firstName.trim()} ${lastName.trim()}`;
		const teacherId = await teachersPage.createTeacher({
			profile: additional,
			firstName,
			lastName,
			code,
			email,
			phone,
			sendAccountInvitation,
			successMessage: get(t)('teacher.createSuccess', { name: fullName }),
		});
		busy = false;
		if (teacherId) {
			open = false;
			resetForm();
			openDetailDrawer(detailHref.schoolTeacherTab(teacherId), currentRouteSurfaceHref($page.url));
		}
	}
</script>

<FormModal
	bind:open
	title={$t('teacher.createTitle')}
	description={$t('teacher.createDescription')}
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
			{$t('common.code')}
		</Label>
		<Input bind:value={code} aria-label={$t('common.code')} />
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
	<div class="flex items-start gap-3 rounded-collection border border-border bg-secondary/30 px-3 py-2.5">
		<Checkbox bind:checked={sendAccountInvitation} id="teacher-send-invite" />
		<div class="space-y-1">
			<Label for="teacher-send-invite" class="text-sm font-medium">
				{$t('invitation.createModal.sendInvite')}
			</Label>
			<p class="text-xs text-muted-foreground">{$t('invitation.createModal.teacherInviteHint')}</p>
		</div>
	</div>
	<details class="space-y-3"><summary class="cursor-pointer text-sm font-medium">{$t('profile.additionalFields')}</summary><PersonProfileFields kind="teacher" bind:values={additional} exclude={['code']} /></details>
</FormModal>
