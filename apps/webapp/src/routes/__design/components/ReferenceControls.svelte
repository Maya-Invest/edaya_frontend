<script lang="ts">
	import type { ReferenceCopy } from '../reference-copy';
	import LanguageSelector from '$lib/components/layout/LanguageSelector.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { lang, t } from '$lib/i18n';
	import ReferenceConfirmations from './ReferenceConfirmations.svelte';
	import ReferenceIconButtons from './ReferenceIconButtons.svelte';
	import ReferenceSelect from './ReferenceSelect.svelte';

	const { copy }: { copy: ReferenceCopy } = $props();
	let previewBusy = $state(false);
	let comboChoice = $state('6e A');
	let invalidChoice = $state('');
	let disabledChoice = $state('6e A');
	let filterChoice = $state('');
	let query = $state('');
</script>

<section id="controls" class="reference-section space-y-4 bg-card p-4 md:p-6">
	<h2 class="font-display text-xl font-semibold">{copy.controls}</h2>
	<div class="flex flex-wrap gap-2"><Button>{$t('common.save')}</Button><Button variant="outline">{copy.cancel}</Button><Button variant="ghost">{copy.quiet}</Button><Button variant="destructive">{copy.delete}</Button><Button variant="destructive-confirm">{copy.delete}</Button><Button disabled aria-describedby="reference-disabled-reason">{copy.disabled}</Button></div>
	<ReferenceIconButtons {copy} />
	<div class="space-y-2"><h3 class="text-sm font-semibold">{$t('lang.label')}</h3><div class="w-fit"><LanguageSelector /></div></div>
	<div class="space-y-4 border-t pt-4" data-testid="reference-query-controls">
		<h3 class="text-sm font-semibold">{$lang === 'fr' ? 'Recherche et filtres en pilule' : 'Pill-shaped search and filters'}</h3>
		<ListSearchField bind:value={query} placeholder={copy.search} />
		<div class="ui-filter-controls grid grid-cols-1 max-w-3xl gap-4 md:grid-cols-2">
			<ReferenceSelect label={copy.className} data-testid="reference-pill-filter" bind:value={filterChoice} options={[{ value: '', label: copy.all }, { value: '6e A', label: '6e A' }]} />
			<div class="space-y-2"><Label for="reference-filter-date">Date</Label><Input id="reference-filter-date" type="date" /></div>
			<div class="space-y-2"><Label for="reference-filter-from">{$lang === 'fr' ? 'Du' : 'From'}</Label><Input id="reference-filter-from" type="date" /></div>
			<div class="space-y-2"><Label for="reference-filter-to">{$lang === 'fr' ? 'Au' : 'To'}</Label><Input id="reference-filter-to" type="date" /></div>
		</div>
	</div>
	<div class="space-y-2 border-t pt-4">
		<h3 class="text-sm font-semibold">{copy.geometry}</h3><p class="text-sm text-muted-foreground">{copy.geometryHint}</p>
		<div class="flex flex-wrap items-center gap-2"><Button data-testid="reference-busy-button" aria-busy={previewBusy} pendingLabel={copy.pending}>{$t('common.save')}</Button><Button variant="ghost" data-testid="reference-toggle-busy" aria-pressed={previewBusy} onclick={() => previewBusy = !previewBusy}>{copy.toggleBusy}</Button></div>
		<p class="text-sm text-muted-foreground">{copy.busyHint}</p><p class="text-sm" data-testid="reference-progress">{previewBusy ? copy.pending : copy.ready}</p>
	</div>
	<p id="reference-disabled-reason" class="text-xs text-muted-foreground">{copy.disabledReason}</p>
	<div class="grid grid-cols-1 max-w-3xl gap-4 md:grid-cols-2">
		<div class="space-y-2"><Label for="reference-email">{copy.email}</Label><Input id="reference-email" type="email" value="famille@example.test" /></div>
		<div class="space-y-2"><Label for="reference-error">{copy.name}</Label><Input id="reference-error" aria-invalid="true" aria-describedby="reference-error-message" /><p id="reference-error-message" class="text-sm text-destructive">{$t('form.invalid')}</p></div>
	</div>
	<div class="max-w-3xl space-y-2"><Label for="reference-notes">{copy.reason}</Label><Textarea id="reference-notes" value={copy.longText} /></div>
	<div class="space-y-4 border-t pt-4" data-testid="reference-select-specimens">
		<h3 class="font-display text-xl font-semibold">{copy.selectGeometry}</h3><p class="text-sm">{copy.selectGeometryHint}</p>
		<div class="grid grid-cols-1 max-w-3xl gap-4 md:grid-cols-2">
			<div class="space-y-2"><Label for="reference-input-height">{copy.name}</Label><Input id="reference-input-height" data-testid="reference-input-height" value="Aminata" /></div>
			<ReferenceSelect label={copy.comboSelect} id="reference-combo-choice" data-testid="reference-combo-choice" bind:value={comboChoice} options={[{ value: '6e A', label: '6e A' }, { value: '6e B', label: '6e B' }, { value: 'long', label: copy.longChoice }, { value: 'disabled', label: `6e C · ${copy.disabled}`, disabled: true }]} />
			<div><ReferenceSelect label={copy.requiredChoice} data-testid="reference-combo-invalid" bind:value={invalidChoice} aria-invalid="true" aria-describedby="reference-combo-error" options={[{ value: '', label: copy.chooseClass }, { value: '6e A', label: '6e A' }]} /><p id="reference-combo-error" class="mt-2 text-sm text-destructive">{copy.chooseClass}</p></div>
			<div><ReferenceSelect label={`${copy.comboSelect} · ${copy.disabled}`} data-testid="reference-combo-disabled" bind:value={disabledChoice} disabled aria-describedby="reference-combo-disabled-reason" options={[{ value: '6e A', label: '6e A' }]} /><p id="reference-combo-disabled-reason" class="mt-2 text-sm text-muted-foreground">{copy.disabledReason}</p></div>
		</div>
	</div>
</section>
<section id="confirmations" class="reference-section space-y-4 bg-card p-4 md:p-6"><ReferenceConfirmations {copy} /></section>
