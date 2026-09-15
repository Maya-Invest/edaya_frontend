<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import Label from '$lib/components/ui/label/label.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { toast } from '$lib/toast.svelte';
	import { get } from 'svelte/store';

	let {
		open = $bindable(false),
		busy = false,
		onConfirm,
	}: {
		open?: boolean;
		busy?: boolean;
		onConfirm: (reason: string) => void | Promise<void>;
	} = $props();

	let reason = $state('');

	function handleOpenChange(next: boolean) {
		open = next;
		if (!next) {
			reason = '';
		}
	}

	async function confirm() {
		const trimmed = reason.trim();
		if (!trimmed) {
			toast.error(get(t)('student.photo.rejectReasonRequired'));
			return;
		}
		await onConfirm(trimmed);
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content data-testid="student-photo-reject-modal">
		<Dialog.Header>
			<Dialog.Title>{$t('student.photo.rejectTitle')}</Dialog.Title>
		</Dialog.Header>
		<div class="space-y-2">
			<Label for="student-photo-reject-reason">{$t('student.photo.rejectReason')}</Label>
			<Textarea id="student-photo-reject-reason" bind:value={reason} rows={4} />
		</div>
		<Dialog.Footer>
			<Button variant="ghost" onclick={() => handleOpenChange(false)} disabled={busy}>
				{$t('common.cancel')}
			</Button>
			<Button variant="destructive" onclick={() => void confirm()} disabled={busy}>
				{$t('student.photo.reject')}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
