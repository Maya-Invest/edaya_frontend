<script lang="ts">
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
		onChange,
	}: {
		name: string;
		initials: string;
		photoUrl?: string | null;
		size?: 'xs' | 'sm' | 'md' | 'list' | 'lg';
		disabled?: boolean;
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
			list: 'rounded-xl',
			lg: 'rounded-2xl',
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
			await onChange(file);
		}
		finally {
			busy = false;
			cropSource = null;
		}
	}
</script>

<div class="group relative shrink-0">
	<PersonAvatar {name} {initials} {photoUrl} {size} />

	{#if !disabled}
		<button
			type="button"
			class={cn(
				'absolute inset-0 flex items-center justify-center bg-primary/60 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100',
				overlayRadius,
				busy && 'opacity-100',
			)}
			disabled={busy}
			aria-label={$t('profilePhoto.change')}
			onclick={() => inputEl?.click()}
		>
			{#if busy}
				<LoaderCircle class="h-5 w-5 animate-spin text-primary-foreground" />
			{:else}
				<Camera class="h-5 w-5 text-primary-foreground" />
			{/if}
		</button>
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
