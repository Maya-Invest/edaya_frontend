<script lang="ts">
	import type { ReferenceCopy } from '../reference-copy';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';

	const { copy }: { copy: ReferenceCopy } = $props();
	let open = $state(false);
	let confirmOpen = $state(false);
	let loading = $state(false);
	let name = $state('Aminata');
	let email = $state('famille@example.test');
	let reason = $state('');
	let className = $state('');
	let result = $state('');
	function show(delayed = false) {
		name = 'Aminata';
		email = 'famille@example.test';
		reason = '';
		className = '';
		result = '';
		loading = delayed;
		open = true;
	}
	$effect(() => {
		if (!open || !loading)
			return;
		const timer = setTimeout(() => loading = false, 1200);
		return () => clearTimeout(timer);
	});
	async function save() {
		await new Promise(resolve => setTimeout(resolve, 300));
		result = copy.saved;
		open = false;
	}
</script>
<div class="space-y-4" data-testid="reference-keyboard"><h3 class="font-display text-xl font-semibold">{copy.keyboard}</h3><p class="text-sm">{copy.keyboardHint}</p><div class="flex flex-wrap gap-2"><Button variant="outline" data-testid="reference-keyboard-open" onclick={() => show()}>{copy.ordinary}</Button><Button variant="outline" data-testid="reference-loading-open" onclick={() => show(true)}>{copy.loadingForm}</Button><Button variant="destructive" data-testid="reference-destructive-open" onclick={() => confirmOpen = true}>{copy.destructiveExample}</Button></div>{#if result}<p role="status" data-testid="reference-keyboard-result">{result}</p>{/if}</div>
<FormModal bind:open title={copy.formTitle} description={copy.keyboardHint} onSubmit={save} submitDisabled={loading}>
	{#if loading}<p role="status">{copy.loading}</p>{:else}
		<label class="block space-y-2 text-sm"><span>{copy.name}</span><Input data-testid="reference-keyboard-name" bind:value={name} defaultValue="Aminata" required /></label>
		<label class="block space-y-2 text-sm"><span>{copy.email}</span><Input data-testid="reference-keyboard-email" bind:value={email} defaultValue="famille@example.test" type="email" required /></label>
		<label class="block space-y-2 text-sm"><span>{copy.reason}</span><Textarea data-testid="reference-keyboard-multiline" bind:value={reason} /></label>
		<label class="block space-y-2 text-sm"><span>{copy.className}</span><SelectField name="class" data-testid="reference-keyboard-picker" bind:value={className} required aria-label={copy.className}><option value="">{copy.chooseClass}</option><optgroup label={copy.className}><option value="6e A">6e A</option><option value="6e B">6e B</option><option disabled value="6e C">6e C</option></optgroup></SelectField></label>
	{/if}
	{#snippet footer({ close, busy, submitDisabled })}<Button variant="outline" onclick={close} disabled={busy}>{copy.cancel}</Button><Button type="reset" variant="ghost" disabled={busy}>{$t('common.reset')}</Button><Button type="submit" disabled={busy || submitDisabled} aria-busy={busy} pendingLabel={copy.pending}>{copy.save}</Button>{/snippet}
</FormModal>
<ConfirmModal bind:open={confirmOpen} title={copy.deleteTitle} target={copy.confirmationExample} description={copy.deleteHint} confirmLabel={copy.delete} onConfirm={() => {
	result = copy.deleted;
	confirmOpen = false;
}}><label class="block space-y-2 text-sm"><span>{copy.reason} · {copy.optional}</span><Input data-testid="reference-confirm-reason" bind:value={reason} /></label></ConfirmModal>
