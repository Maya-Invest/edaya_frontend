<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { t } from '$lib/i18n';
	import { Trash2 } from '$lib/icons';

	const {
		disabled = false,
		title,
		confirmTitle,
		confirmDescription,
		onConfirm,
		size = 'sm',
		variant = 'outline',
	}: {
		disabled?: boolean;
		title?: string;
		confirmTitle: string;
		confirmDescription?: string;
		onConfirm: () => Promise<boolean>;
		size?: 'sm' | 'default';
		variant?: 'outline' | 'ghost' | 'destructive';
	} = $props();

	let open = $state(false);
	let busy = $state(false);

	async function handleConfirm() {
		busy = true;
		try {
			const ok = await onConfirm();
			if (ok) {
				open = false;
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<Button
	{variant}
	{size}
	class="rounded-full text-destructive hover:text-destructive"
	{disabled}
	{title}
	onclick={() => (open = true)}
>
	<Trash2 class="mr-1 h-3.5 w-3.5" />
	{$t('common.delete')}
</Button>

<ConfirmModal
	bind:open
	title={confirmTitle}
	description={confirmDescription}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={busy}
	onConfirm={handleConfirm}
/>
