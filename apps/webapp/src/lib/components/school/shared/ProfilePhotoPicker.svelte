<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { Camera, LoaderCircle } from '$lib/icons';
	import { cn } from '$lib/utils';
	import PersonAvatar from './PersonAvatar.svelte';
	import ProfilePhotoCropDialog from './ProfilePhotoCropDialog.svelte';

	const {
		name,
		initials,
		photoUrl = null,
		size = 'lg',
		disabled = false,
		trigger = 'avatar',
		label,
		onChange,
	}: {
		name: string;
		initials: string;
		photoUrl?: string | null;
		size?: 'xs' | 'sm' | 'md' | 'list' | 'lg' | 'studentHeader';
		disabled?: boolean;
		trigger?: 'avatar' | 'button';
		label?: string;
		onChange: (file: File) => Promise<boolean>;
	} = $props();

	let inputEl = $state<HTMLInputElement | undefined>();
	let busy = $state(false);
	let cropOpen = $state(false);
	let cropSource = $state<Blob | null>(null);

	const overlayRadius = $derived(
		{
			xs: 'rounded-full',
			sm: 'rounded-full',
			md: 'rounded-full',
			list: 'rounded-lg',
			studentHeader: 'rounded-full',
			lg: 'rounded-lg',
		}[size],
	);

	function handleFile(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file || busy || disabled) {
			return;
		}
		if (!file.type.startsWith('image/')) {
			return;
		}
		cropSource = file;
		cropOpen = true;
	}

	async function handleCropped(file: File) {
		busy = true;
		try {
			const saved = await onChange(file);
			if (saved)
				cropSource = null;
			return saved;
		}
		finally {
			busy = false;
		}
	}
</script>

<div class="group relative shrink-0">
	{#if trigger === 'avatar'}<PersonAvatar {name} {initials} {photoUrl} {size} />{/if}

	{#if !disabled}
		{#if trigger === 'button'}
			<Button variant="outline" aria-busy={busy} pendingLabel={$t('dataState.loading')} onclick={() => inputEl?.click()}>{label ?? $t('profilePhoto.change')}</Button>
		{:else}
			<button
				type="button"
				class={cn(
					'absolute inset-0 flex items-center justify-center bg-primary/60 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100',
					overlayRadius,
					busy && 'opacity-100',
				)}
				disabled={busy}
				aria-label={label ?? $t('profilePhoto.change')}
				onclick={() => inputEl?.click()}
			>
				{#if busy}
					<LoaderCircle class="h-5 w-5 animate-spin text-primary-foreground" />
				{:else}
					<Camera class="h-5 w-5 text-primary-foreground" />
				{/if}
			</button>
		{/if}
		<input
			bind:this={inputEl}
			type="file"
			accept="image/jpeg,image/png,image/webp"
			class="sr-only"
			onchange={handleFile}
		/>
	{/if}
</div>

<ProfilePhotoCropDialog bind:open={cropOpen} source={cropSource} onConfirm={handleCropped} />
