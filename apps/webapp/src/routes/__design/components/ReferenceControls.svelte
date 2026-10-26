<script lang="ts">
	import type { ReferenceCopy } from '../reference-copy';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import Button from './ReferenceButton.svelte';

	const { copy }: { copy: ReferenceCopy } = $props();
	let previewBusy = $state(false);
</script>

<section id="controls" class="reference-section space-y-4 bg-card p-4 md:p-6">
	<h2 class="font-display text-xl font-semibold">{copy.controls}</h2>
	<div class="flex flex-wrap gap-2"><Button>{$t('common.save')}</Button><Button variant="outline">{copy.cancel}</Button><Button variant="ghost">{copy.quiet}</Button><Button variant="destructive">{copy.delete}</Button><Button variant="destructive-confirm">{copy.delete}</Button><Button disabled aria-describedby="reference-disabled-reason">{copy.disabled}</Button></div>
	<div class="space-y-2 border-t pt-4">
		<h3 class="text-sm font-semibold">{copy.geometry}</h3><p class="text-sm text-muted-foreground">{copy.geometryHint}</p>
		<div class="flex flex-wrap items-center gap-2"><Button data-testid="reference-busy-button" aria-busy={previewBusy} pendingLabel={copy.pending}>{$t('common.save')}</Button><Button variant="ghost" data-testid="reference-toggle-busy" aria-pressed={previewBusy} onclick={() => previewBusy = !previewBusy}>{copy.toggleBusy}</Button></div>
		<p class="text-sm text-muted-foreground">{copy.busyHint}</p><p class="text-sm" data-testid="reference-progress">{previewBusy ? copy.pending : copy.ready}</p>
	</div>
	<p id="reference-disabled-reason" class="text-xs text-muted-foreground">{copy.disabledReason}</p>
	<div class="grid max-w-3xl gap-4 md:grid-cols-2">
		<div class="space-y-2"><Label for="reference-email">{copy.email}</Label><Input id="reference-email" type="email" value="famille@example.test" /></div>
		<div class="space-y-2"><Label for="reference-error">{copy.name}</Label><Input id="reference-error" aria-invalid="true" aria-describedby="reference-error-message" /><p id="reference-error-message" class="text-sm text-destructive">{$t('form.invalid')}</p></div>
	</div>
	<div class="max-w-3xl space-y-2"><Label for="reference-notes">{copy.reason}</Label><Textarea id="reference-notes" value={copy.longText} /></div>
</section>
