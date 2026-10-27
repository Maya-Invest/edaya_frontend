<script lang="ts">
	import type { Guardian } from '$lib/types/school';
	import { authSession } from '$lib/auth/session.svelte';
	import GuardianContactFields from '$lib/components/school/shared/GuardianContactFields.svelte';
	import PersonProfileFields from '$lib/components/school/shared/PersonProfileFields.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { guardianContactDraft, guardianContactPayload } from '$lib/guardians/contact-fields';
	import { t } from '$lib/i18n';
	import { personFieldDraft } from '$lib/people-profile-fields';
	import { onDestroy, untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { getGuardiansPageState } from '../../guardians-page.svelte';

	let { guardian, disabled = false, title, open = $bindable(false), showTrigger = true }: {
		guardian: Guardian;
		disabled?: boolean;
		title?: string;
		open?: boolean;
		showTrigger?: boolean;
	} = $props();
	const guardiansPage = getGuardiansPageState();
	let busy = $state(false);
	let hasAccess = $state(true);
	let additional = $state<Record<string, string>>({});
	let firstName = $state('');
	let lastName = $state('');
	let contacts = $state(guardianContactDraft());
	function resetForm() {
		additional = personFieldDraft('guardian', guardian);
		hasAccess = guardian.hasAccess ?? false;
		firstName = guardian.firstName ?? '';
		lastName = guardian.lastName ?? '';
		contacts = guardianContactDraft(guardian);
	}
	let mounted = true;
	onDestroy(() => {
		mounted = false;
	});
	let hydratedKey = '';
	function identity() {
		return JSON.stringify([authSession.authUserId, authSession.schoolId, authSession.subjectId, guardian.id]);
	}
	$effect.pre(() => {
		const key = open ? identity() : '';
		if (key && key !== hydratedKey)
			untrack(resetForm);
		hydratedKey = key;
	});
	const canSubmit = $derived(lastName.trim().length > 0);
	async function submit() {
		if (!canSubmit) {
			return;
		}
		if (busy)
			return;
		const submittedIdentity = identity();
		busy = true;
		const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
		const ok = await guardiansPage.updateContact({
			guardianId: guardian.id,
			profile: additional,
			firstName,
			lastName,
			...guardianContactPayload(contacts),
			hasAccess,
			successMessage: get(t)('guardian.updateSuccess', { name: fullName }),
		});
		busy = false;
		if (ok && mounted && identity() === submittedIdentity) {
			open = false;
		}
	}
</script>

{#if showTrigger}
	<Button variant="outline" size="sm" {disabled} {title} onclick={() => (open = true)}>
		{$t('guardian.editContact')}
	</Button>
{/if}

<FormModal contentClass="max-w-3xl"
	bind:open
	title={$t('guardian.editTitle', { name: guardian.name })}
	description={$t('guardian.editDescription')}
	submitLabel={$t('common.save')}
	{busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('common.firstName')}
			</Label>
			<Input bind:value={firstName} aria-label={$t('common.firstName')} />
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('common.lastName')}
			</Label>
			<Input bind:value={lastName} aria-label={$t('common.lastName')} />
		</div>
	</div>
	<GuardianContactFields bind:contacts disabled={busy} />
	<label class="flex items-center gap-2"><input type="checkbox" bind:checked={hasAccess} />{$t('profile.portalAccess')}</label>

	<PersonProfileFields kind="guardian" bind:values={additional} />
</FormModal>
