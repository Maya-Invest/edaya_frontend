<script lang="ts">
	import type { Snippet } from 'svelte';
	import { t } from '$lib/i18n';
	import FormModal from './FormModal.svelte';

	let { open = $bindable(false), title, description, confirmLabel = $t('common.add'), cancelLabel = $t('common.cancel'), busy = false, dirty, confirmDisabled = false, children, onCancel, onConfirm }: {
		open?: boolean;
		title: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		busy?: boolean;
		dirty?: boolean;
		confirmDisabled?: boolean;
		children?: Snippet;
		onCancel?: () => void;
		onConfirm: () => void | Promise<void>;
	} = $props();
</script>
<FormModal bind:open {title} {description} {busy} {dirty} submitDisabled={confirmDisabled} submitLabel={confirmLabel} {cancelLabel} {onCancel} onSubmit={onConfirm}>
	<div data-testid="picker-modal">{@render children?.()}</div>
</FormModal>
