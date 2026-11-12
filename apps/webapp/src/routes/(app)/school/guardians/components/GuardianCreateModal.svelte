<script lang="ts">
	import { page } from '$app/stores';
	import GuardianContactFields from '$lib/components/school/shared/GuardianContactFields.svelte';
	import PersonProfileFields from '$lib/components/school/shared/PersonProfileFields.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { guardianContactDraft, guardianContactPayload } from '$lib/guardians/contact-fields';
	import { t } from '$lib/i18n';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { personFieldDraft } from '$lib/people-profile-fields';
	import IdentifierInput from '$lib/smart-components/human-identifier/IdentifierInput.svelte';
	import { get } from 'svelte/store';
	import { getGuardiansPageState } from '../guardians-page.svelte';

	let { open = $bindable(false) }: {
		open?: boolean;
	} = $props();
	const guardiansPage = getGuardiansPageState();
	let busy = $state(false);
	let additional = $state<Record<string, string>>(personFieldDraft('guardian'));
	let firstName = $state('');
	let lastName = $state('');
	let contacts = $state(guardianContactDraft());
	let hasAccess = $state(true);
	let sendAccountInvitation = $state(true);
	function resetForm() {
		additional = personFieldDraft('guardian');
		firstName = '';
		lastName = '';
		contacts = guardianContactDraft();
		hasAccess = true;
		sendAccountInvitation = true;
	}
	const canSubmit = $derived(lastName.trim().length > 0);
	async function submit() {
		if (!canSubmit) {
			return;
		}
		busy = true;
		const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
		const guardianId = await guardiansPage.createGuardian({
			profile: additional,
			firstName,
			lastName,
			...guardianContactPayload(contacts),
			hasAccess,
			sendAccountInvitation,
			successMessage: get(t)('guardian.createSuccess', { name: fullName }),
		});
		busy = false;
		if (guardianId) {
			open = false;
			resetForm();
			openDetailDrawer(detailHref.schoolGuardian(guardianId), currentRouteSurfaceHref($page.url));
		}
	}
</script>

<FormModal
	bind:open
	title={$t('guardian.createTitle')}
	description={$t('guardian.createDescription')}
	submitLabel={$t('common.save')}
	{busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<IdentifierInput bind:profile={additional} />
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
	<GuardianContactFields bind:contacts />
	<label class="flex items-center gap-2"><Checkbox bind:checked={hasAccess} />{$t('profile.portalAccess')}</label>

	<div class="flex items-start gap-3 rounded-collection border border-border bg-secondary/30 px-3 py-2.5">
		<Checkbox bind:checked={sendAccountInvitation} id="guardian-send-invite" />
		<div class="space-y-1">
			<Label for="guardian-send-invite" class="text-sm font-medium">
				{$t('invitation.createModal.sendInvite')}
			</Label>
			<p class="text-xs text-muted-foreground">{$t('invitation.createModal.sendInviteHint')}</p>
		</div>
	</div>
	<details class="space-y-3"><summary class="cursor-pointer text-sm font-medium">{$t('profile.additionalFields')}</summary><PersonProfileFields kind="guardian" bind:values={additional} exclude={['identifier']} /></details>
</FormModal>
