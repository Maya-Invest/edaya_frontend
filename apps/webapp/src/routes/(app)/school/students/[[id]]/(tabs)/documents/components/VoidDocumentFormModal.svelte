<script lang="ts">
	import { voidDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';

	let {
		open = $bindable(false),
		issuanceId,
	}: {
		open?: boolean;
		issuanceId: string | null;
	} = $props();

	let reason = $state('');
	let busy = $state(false);
	const canSubmit = $derived(Boolean(issuanceId) && reason.trim().length > 0);

	$effect(() => {
		if (open) {
			reason = '';
		}
	});

	async function submit() {
		if (!issuanceId || !canSubmit || busy) {
			return;
		}
		busy = true;
		try {
			const ok = await voidDocumentIssuanceMutation({
				issuanceId,
				reason: reason.trim(),
				successMessage: $t('documents.toastVoided'),
			});
			if (ok) {
				open = false;
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={$t('documents.voidTitle')}
	description={$t('documents.voidDescription')}
	submitLabel={$t('documents.void')}
	cancelLabel={$t('common.cancel')}
	{busy}
	submitDisabled={!canSubmit}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('documents.voidReason')}
		</Label>
		<Textarea bind:value={reason} rows={3} />
	</div>
</FormModal>
