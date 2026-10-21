<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { Guardian } from '$lib/types/school';
	import GuardianContactMethodsEditor from '$lib/components/school/shared/GuardianContactMethodsEditor.svelte';
	import PersonProfileFields from '$lib/components/school/shared/PersonProfileFields.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { personFieldDraft } from '$lib/people-profile-fields';
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
	let contactMethods = $state<components['schemas']['Guardian']['contactMethods']>([]);
	function resetForm() {
		additional = personFieldDraft('guardian', guardian);
		hasAccess = guardian.hasAccess ?? false;
		firstName = guardian.firstName ?? '';
		lastName = guardian.lastName ?? '';
		contactMethods = (guardian.contactMethods ?? []).map(method => ({ ...method }));
	}
	$effect(() => {
		resetForm();
	});
	const canSubmit = $derived(firstName.trim().length > 0 && lastName.trim().length > 0 && contactMethods.every(method => method.value.trim()));
	async function submit() {
		if (!canSubmit) {
			return;
		}
		busy = true;
		const fullName = `${firstName.trim()} ${lastName.trim()}`;
		const ok = await guardiansPage.updateContact({
			guardianId: guardian.id,
			profile: additional,
			firstName,
			lastName,
			contactMethods,
			hasAccess,
			email: contactMethods.find(method => method.type === 'email')?.value ?? '',
			phone: contactMethods.find(method => method.type === 'phone')?.value ?? '',
			successMessage: get(t)('guardian.updateSuccess', { name: fullName }),
		});
		busy = false;
		if (ok) {
			open = false;
		}
	}
</script>

{#if showTrigger}
	<Button variant="outline" size="sm" class="rounded-full" {disabled} {title} onclick={() => (open = true)}>
		{$t('guardian.editContact')}
	</Button>
{/if}

<FormModal
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
	<GuardianContactMethodsEditor bind:methods={contactMethods} />
	<label class="flex items-center gap-2"><input type="checkbox" bind:checked={hasAccess} />{$t('profile.portalAccess')}</label>

	<PersonProfileFields kind="guardian" bind:values={additional} />
</FormModal>
