<script lang="ts">
	import { STUDENT_IMPORT_ACCEPT, STUDENT_IMPORT_MAX_FILE_BYTES } from '$lib/import/shared/file-accept';
	import { t } from '$lib/i18n';
	import { cn } from '$lib/utils';

	let {
		disabled = false,
		errorMessage = '',
		selectedFileName = '',
		onFileSelected,
	}: {
		disabled?: boolean;
		errorMessage?: string;
		selectedFileName?: string;
		onFileSelected?: (file: File) => void | Promise<void>;
	} = $props();

	let dragActive = $state(false);
	let inputEl = $state<HTMLInputElement | undefined>();

	function openPicker() {
		if (disabled) {
			return;
		}
		inputEl?.click();
	}

	async function handleFile(file: File | undefined) {
		if (!file || disabled) {
			return;
		}
		await onFileSelected?.(file);
	}

	async function onInputChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		await handleFile(file);
		input.value = '';
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
		if (disabled) {
			return;
		}
		const file = event.dataTransfer?.files?.[0];
		void handleFile(file);
	}
</script>

<div class="space-y-2">
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		role="region"
		tabindex={disabled ? undefined : 0}
		class={cn(
			'rounded-xl border border-dashed px-4 py-8 text-center transition-colors',
			disabled && 'cursor-not-allowed opacity-60',
			!disabled && 'cursor-pointer hover:border-primary/60 hover:bg-secondary/30',
			dragActive && 'border-primary bg-primary/5',
			errorMessage ? 'border-destructive/50' : 'border-border',
		)}
		data-testid="import-file-dropzone"
		ondragenter={() => {
			if (!disabled) {
				dragActive = true;
			}
		}}
		ondragleave={() => {
			dragActive = false;
		}}
		ondragover={(event) => {
			event.preventDefault();
		}}
		ondrop={onDrop}
		onclick={openPicker}
		onkeydown={(event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				openPicker();
			}
		}}
	>
		<p class="text-sm font-medium">{$t('import.students.uploadDropzone')}</p>
		<p class="mt-1 text-xs text-muted-foreground">{$t('import.students.uploadBrowse')}</p>
		<p class="mt-3 text-xs text-muted-foreground">{$t('import.formats')}</p>
	</div>

	<input
		bind:this={inputEl}
		type="file"
		accept={STUDENT_IMPORT_ACCEPT}
		class="hidden"
		disabled={disabled}
		data-testid="import-file-input"
		onchange={onInputChange}
	/>

	{#if selectedFileName}
		<p class="text-sm text-muted-foreground" data-testid="import-selected-file">
			{$t('import.students.uploadSelected', { name: selectedFileName })}
		</p>
	{/if}

	{#if errorMessage}
		<p class="text-sm text-destructive" data-testid="import-file-error">{errorMessage}</p>
	{/if}

	<p class="text-xs text-muted-foreground">
		{$t('import.students.uploadMaxSize', { size: Math.round(STUDENT_IMPORT_MAX_FILE_BYTES / (1024 * 1024)) })}
	</p>
</div>
