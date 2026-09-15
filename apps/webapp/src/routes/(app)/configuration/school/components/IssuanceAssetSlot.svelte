<script lang="ts">
	import type { SchoolIssuanceAssetPurpose } from '$lib/api/mutations/issuance-asset.mutations';
	import { loadPrivateImage } from '$lib/api/private-image';
	import { privateAttachmentContentPath } from '$lib/api/school-data';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { cn } from '$lib/utils';

	const {
		purpose,
		label,
		attachmentId,
		publicAllowed,
		canPublish,
		canManage,
		busy,
		onUpload,
		onClear,
		onPublicChange,
	}: {
		purpose: SchoolIssuanceAssetPurpose;
		label: string;
		attachmentId: string | null | undefined;
		publicAllowed: boolean;
		canPublish: boolean;
		canManage: boolean;
		busy: boolean;
		onUpload: (file: File) => void | Promise<void>;
		onClear: () => void | Promise<void>;
		onPublicChange: (next: boolean) => void | Promise<void>;
	} = $props();

	const uid = $props.id();
	let imageSource = $state<string | null>(null);
	let clearOpen = $state(false);

	const hasAsset = $derived(Boolean(attachmentId));
	const actionsDisabled = $derived(!canManage || busy);
	const publicDisabled = $derived(!canManage || !hasAsset || busy);

	$effect(() => {
		const id = attachmentId;
		imageSource = null;
		if (!id) {
			return;
		}
		const controller = new AbortController();
		let dispose = () => {};
		void loadPrivateImage(privateAttachmentContentPath(id), controller.signal)
			.then((image) => {
				if (controller.signal.aborted) {
					image.dispose();
					return;
				}
				dispose = image.dispose;
				imageSource = image.url;
			})
			.catch(() => {});
		return () => {
			controller.abort();
			dispose();
		};
	});

	function handleFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file || actionsDisabled) {
			return;
		}
		void onUpload(file);
	}

	async function confirmClear() {
		await onClear();
		clearOpen = false;
	}
</script>

<div class="space-y-2" data-purpose={purpose}>
	<div class="flex items-center gap-3">
		<div
			class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted"
			aria-hidden={imageSource ? undefined : 'true'}
		>
			{#if imageSource}
				<img
					src={imageSource}
					alt={label}
					loading="lazy"
					decoding="async"
					class="h-full w-full object-contain"
				/>
			{/if}
		</div>
		<div class="min-w-0 flex-1">
			<p class="text-sm font-medium">{label}</p>
			<p class="text-xs text-muted-foreground">
				{hasAsset ? $t('schoolSettings.assetUploaded') : $t('schoolSettings.assetMissing')}
			</p>
		</div>
		<div class="flex shrink-0 items-center gap-2">
			<label
				class={cn(
					buttonVariants({ size: 'sm', variant: 'outline', class: 'rounded-full' }),
					actionsDisabled && 'pointer-events-none opacity-50',
				)}
			>
				<input
					id="{uid}-file"
					type="file"
					accept="image/png,image/jpeg,image/webp"
					class="sr-only"
					disabled={actionsDisabled}
					onchange={handleFileChange}
				/>
				{hasAsset ? $t('schoolSettings.assetReplace') : $t('schoolSettings.assetChoose')}
			</label>
			{#if hasAsset && canManage}
				<Button
					size="sm"
					variant="outline"
					class="rounded-full"
					disabled={busy}
					onclick={() => (clearOpen = true)}
				>
					{$t('schoolSettings.assetClear')}
				</Button>
			{/if}
		</div>
	</div>
	{#if canPublish}
		<div class="flex items-center gap-2 pl-[4.75rem]">
			<Checkbox
				id="{uid}-public"
				checked={publicAllowed}
				disabled={publicDisabled}
				onCheckedChange={(checked) => {
					void onPublicChange(checked === true);
				}}
			/>
			<Label for="{uid}-public" class="text-sm font-normal text-foreground">
				{$t('schoolSettings.assetPublic')}
			</Label>
		</div>
	{/if}
</div>

<ConfirmModal
	bind:open={clearOpen}
	title={$t('schoolSettings.assetClearTitle', { slot: label })}
	description={$t('schoolSettings.assetClearDescription')}
	confirmLabel={$t('schoolSettings.assetClear')}
	cancelLabel={$t('common.cancel')}
	busy={busy}
	variant="destructive"
	onConfirm={confirmClear}
/>
