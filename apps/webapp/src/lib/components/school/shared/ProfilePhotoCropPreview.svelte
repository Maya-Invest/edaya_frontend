<script lang="ts">
	import { exportProfilePhotoJpeg, ProfilePhotoTooLargeError } from '$lib/api/profile-photo-normalize';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { RotateCw } from '$lib/icons';
	import { toast } from '$lib/toast.svelte';
	import { get } from 'svelte/store';

	let {
		source,
		busy = $bindable(false),
		onConfirm,
		onCancel,
	}: {
		source: Blob;
		busy?: boolean;
		onConfirm: (file: File) => Promise<void> | void;
		onCancel: () => void;
	} = $props();

	let previewUrl = $state<string | null>(null);
	let turns = $state(0);

	$effect(() => {
		const blob = source;
		const url = URL.createObjectURL(blob);
		previewUrl = url;
		return () => {
			URL.revokeObjectURL(url);
		};
	});

	async function confirm() {
		if (busy) {
			return;
		}
		busy = true;
		try {
			const file = await exportProfilePhotoJpeg({ source, rotationTurns: turns });
			await onConfirm(file);
		}
		catch (error) {
			if (error instanceof ProfilePhotoTooLargeError) {
				toast.error(get(t)('profilePhoto.tooLarge'));
				return;
			}
			throw error;
		}
		finally {
			busy = false;
		}
	}
</script>

<div class="flex flex-col items-center gap-4">
	<div class="flex h-56 w-56 items-center justify-center overflow-hidden rounded-2xl bg-secondary">
		{#if previewUrl}
			<img
				src={previewUrl}
				alt=""
				class="h-full w-full object-cover"
				style={`transform: rotate(${turns * 90}deg)`}
			/>
		{/if}
	</div>
	<Button type="button" variant="outline" disabled={busy} onclick={() => (turns = (turns + 1) % 4)}>
		<RotateCw />
		{$t('profilePhoto.rotate')}
	</Button>
</div>
<div class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
	<Button type="button" variant="ghost" disabled={busy} onclick={onCancel}>
		{$t('common.cancel')}
	</Button>
	<Button type="button" disabled={busy} onclick={() => void confirm()}>
		{$t('profilePhoto.confirmCrop')}
	</Button>
</div>
