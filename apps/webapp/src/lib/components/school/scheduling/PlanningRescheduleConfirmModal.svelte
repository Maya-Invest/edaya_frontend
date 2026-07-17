<script lang="ts">
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import { t } from '$lib/i18n';

	let {
		open = $bindable(false),
		title,
		fromLabel,
		toLabel,
		busy = false,
		onConfirm,
		onCancel,
	}: {
		open?: boolean;
		title: string;
		fromLabel: string;
		toLabel: string;
		busy?: boolean;
		onConfirm: () => void | Promise<void>;
		onCancel?: () => void;
	} = $props();
</script>

<FormModal
	bind:open
	title={$t('planning.rescheduleTitle')}
	description={$t('planning.rescheduleDescription', { title })}
	submitLabel={$t('planning.rescheduleConfirm')}
	cancelLabel={$t('common.cancel')}
	{busy}
	onCancel={() => onCancel?.()}
	onSubmit={onConfirm}
>
	<div class="space-y-3 rounded-xl bg-secondary/50 p-4 text-sm">
		<div>
			<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
				{$t('planning.rescheduleFrom')}
			</p>
			<p class="mt-1 font-medium">{fromLabel}</p>
		</div>
		<div class="text-muted-foreground">→</div>
		<div>
			<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
				{$t('planning.rescheduleTo')}
			</p>
			<p class="mt-1 font-medium">{toLabel}</p>
		</div>
	</div>
</FormModal>
