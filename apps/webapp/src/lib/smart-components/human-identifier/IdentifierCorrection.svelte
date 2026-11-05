<script lang="ts">
	import type { PersonKind } from '$lib/people-profile-fields';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { hasPermission } from '$lib/permissions';
	import { IdentifierCorrectionState } from './identifier-correction-state.svelte';

	const { kind, entityId, identifier, onCorrected }: { kind: PersonKind; entityId: string; identifier: string; onCorrected: (value: string) => void } = $props();
	const owner = new IdentifierCorrectionState(() => ({ kind, entityId, identifier, onCorrected }));
</script>
{#if hasPermission('ACCESS_CONTROL_MANAGE')}<Button size="sm" variant="outline" onclick={owner.begin}>{$t('identifier.correct')}</Button>{/if}
<FormModal bind:open={owner.open} title={$t('identifier.correct')} description={$t('identifier.correctionHelp')} submitLabel={$t('common.save')} busy={owner.busy} submitDisabled={!owner.valid} onSubmit={owner.submit}>
	<p class="text-sm">{$t('durableImport.current')}: {owner.expected}</p>
	<Label class="block space-y-2"><span>{$t('profile.identifier')}</span><Input bind:value={owner.proposed} maxlength={20} /></Label>
</FormModal>
