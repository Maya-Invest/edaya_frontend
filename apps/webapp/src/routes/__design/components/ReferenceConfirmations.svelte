<script lang="ts">
	import type { ReferenceCopy } from '../reference-copy';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';

	const { copy }: { copy: ReferenceCopy } = $props();
	let open = $state(false);
	let destructive = $state(false);
	let pending = $state(false);
	let failed = $state(false);
	let simulateFailure = $state(false);
	let outcome = $state('');
	function show(isDestructive: boolean) {
		destructive = isDestructive;
		failed = false;
		outcome = '';
		open = true;
	}
	async function confirm() {
		if (pending)
			return;
		pending = true;
		failed = false;
		// Local latency only: demonstrates pending/failure without a business operation.
		await new Promise(resolve => setTimeout(resolve, 700));
		pending = false;
		if (simulateFailure) {
			failed = true;
			return;
		}
		outcome = destructive ? copy.deleted : copy.saved;
		open = false;
	}
</script>

<div class="space-y-4 border-t pt-4" data-testid="reference-confirmations">
	<h2 class="font-display text-xl font-semibold">{copy.dialogs}</h2>
	<p class="text-sm">{copy.confirmationHint}</p>
	<div class="flex flex-wrap gap-2"><Button variant="outline" data-testid="reference-confirm-standard-open" onclick={() => show(false)}>{copy.applyPreview}</Button><Button variant="destructive" data-testid="reference-confirm-delete-open" onclick={() => show(true)}>{copy.destructiveExample}</Button></div>
	<label class="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" bind:checked={simulateFailure} />{copy.simulateFailure}</label>
	{#if outcome}<p class="text-sm" role="status">{outcome}</p>{/if}
</div>
<ConfirmModal bind:open title={destructive ? copy.deleteTitle : copy.applyPreviewTitle} target={copy.confirmationExample} description={destructive ? copy.confirmationDeleteHint : copy.applyPreviewHint} variant={destructive ? 'destructive' : 'default'} confirmLabel={destructive ? copy.delete : copy.confirmApply} cancelLabel={copy.cancel} busy={pending} errorMessage={failed ? copy.confirmationFailure : undefined} onConfirm={confirm} />
