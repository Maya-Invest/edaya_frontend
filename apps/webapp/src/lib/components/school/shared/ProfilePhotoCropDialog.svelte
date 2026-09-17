<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { t } from '$lib/i18n';
	import ProfilePhotoCropPreview from './ProfilePhotoCropPreview.svelte';

	let {
		open = $bindable(false),
		source = null,
		onConfirm,
	}: {
		open?: boolean;
		source: Blob | null;
		onConfirm: (file: File) => Promise<void> | void;
	} = $props();

	let busy = $state(false);

	function handleOpenChange(next: boolean) {
		if (busy && !next) {
			return;
		}
		open = next;
	}

	async function confirm(file: File) {
		await onConfirm(file);
		open = false;
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content data-testid="profile-photo-crop-dialog">
		<Dialog.Header>
			<Dialog.Title>{$t('profilePhoto.cropTitle')}</Dialog.Title>
			<Dialog.Description>{$t('profilePhoto.cropHint')}</Dialog.Description>
		</Dialog.Header>
		{#if source}
			{#key source}
				<ProfilePhotoCropPreview
					{source}
					bind:busy
					onConfirm={confirm}
					onCancel={() => handleOpenChange(false)}
				/>
			{/key}
		{:else}
			<Dialog.Footer>
				<Button type="button" variant="ghost" onclick={() => handleOpenChange(false)}>
					{$t('common.cancel')}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
