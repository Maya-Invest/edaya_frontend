<script lang="ts">
	import type { ReferenceCopy } from '../reference-copy';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { tick } from 'svelte';
	import Button from './ReferenceButton.svelte';

	// Reference-local keyboard contract. No production props, routes or commands.
	const { copy }: { copy: ReferenceCopy } = $props();
	let open = $state(false);
	let destructive = $state(false);
	let loading = $state(false);
	let discardOpen = $state(false);
	let pending = $state(false);
	let name = $state('Aminata');
	let email = $state('famille@example.test');
	let reason = $state('');
	let className = $state('6e A');
	let pickerOpen = $state(false);
	let invalid = $state(false);
	let result = $state('');
	let baseline = $state('');
	let form = $state<HTMLFormElement>();
	let heading: HTMLSpanElement;
	let origin: HTMLElement | null = null;
	let composing = false;
	const dirty = $derived(JSON.stringify([name, email, reason, className]) !== baseline);
	function show(mode: 'ordinary' | 'loading' | 'destructive') {
		origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		destructive = mode === 'destructive';
		loading = mode === 'loading';
		name = 'Aminata';
		email = 'famille@example.test';
		reason = '';
		className = '6e A';
		baseline = JSON.stringify([name, email, reason, className]);
		invalid = false;
		composing = false;
		pickerOpen = false;
		result = '';
		open = true;
	}
	function firstField() {
		form?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus();
	}
	async function initialFocus(event: Event) {
		event.preventDefault();
		await tick();
		if (destructive)
			form?.querySelector<HTMLButtonElement>('[data-testid=reference-keyboard-cancel]')?.focus();
		else if (loading)
			heading?.focus();
		else firstField();
	}
	$effect(() => {
		if (!open || !loading)
			return;
		const timer = setTimeout(async () => {
			const retainedFocus = document.activeElement === heading;
			loading = false;
			await tick();
			if (open && retainedFocus && document.activeElement === heading)
				firstField();
		}, 1200);
		return () => clearTimeout(timer);
	});
	function requestClose() {
		if (pending)
			return;
		if (dirty)
			discardOpen = true;
		else open = false;
	}
	function keydown(event: KeyboardEvent) {
		if (event.key !== 'Enter')
			return;
		if (event.isComposing || composing || event.keyCode === 229) {
			event.preventDefault();
			return;
		}
		if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement)
			return;
		if (destructive && event.target instanceof HTMLInputElement)
			event.preventDefault();
	}
	async function save() {
		if (!form || pending || loading || composing || destructive)
			return;
		invalid = !form.checkValidity();
		if (invalid) {
			form.querySelector<HTMLElement>(':invalid')?.focus();
			return;
		}
		pending = true;
		// Local latency exposes duplicate-submit protection without a business request.
		await new Promise(resolve => setTimeout(resolve, 300));
		result = copy.saved;
		pending = false;
		open = false;
	}
</script>

<div class="space-y-4" data-testid="reference-keyboard">
	<h3 class="font-display text-xl font-semibold">{copy.keyboard}</h3>
	<p class="text-sm">{copy.keyboardHint}</p>
	<div class="flex flex-wrap gap-2"><Button variant="outline" data-testid="reference-keyboard-open" onclick={() => show('ordinary')}>{copy.ordinary}</Button><Button variant="outline" data-testid="reference-loading-open" onclick={() => show('loading')}>{copy.loadingForm}</Button><Button variant="destructive" data-testid="reference-destructive-open" onclick={() => show('destructive')}>{copy.destructiveExample}</Button></div>
	{#if result}<p role="status" data-testid="reference-keyboard-result" class="text-sm">{result}</p>{/if}
</div>
<Dialog.Root {open} onOpenChange={(next) => {
	if (!next)
		requestClose();
}}>
	<Dialog.Content data-testid="reference-keyboard-dialog" class="reference-keyboard-dialog" onOpenAutoFocus={initialFocus} onCloseAutoFocus={(event) => {
		event.preventDefault();
		origin?.focus();
	}} onEscapeKeydown={(event) => {
		event.preventDefault();
		requestClose();
	}} onInteractOutside={(event) => {
		event.preventDefault();
		requestClose();
	}}>
		<Dialog.Title><span bind:this={heading} tabindex="-1">{destructive ? copy.deleteTitle : copy.formTitle}</span></Dialog.Title>
		<!-- Keyboard/composition events bubble from the fields; submission stays on the semantic form. -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<form bind:this={form} novalidate onsubmit={(event) => {
			event.preventDefault();
			void save();
		}} onkeydown={keydown} oncompositionstart={() => composing = true} oncompositionend={() => composing = false} class="reference-keyboard-form">
			<div class="reference-keyboard-fields space-y-4" aria-busy={loading || pending}>
				<Dialog.Description>{destructive ? copy.deleteHint : copy.keyboardHint}</Dialog.Description>
				{#if loading}<p role="status">{copy.loading}</p>
				{:else if destructive}<label class="block space-y-2 text-sm"><span>{copy.reason} · {copy.optional}</span><Input data-testid="reference-confirm-reason" bind:value={reason} /></label>
				{:else}
					<label class="block space-y-2 text-sm"><span>{copy.name}</span><Input data-testid="reference-keyboard-name" bind:value={name} required disabled={pending} aria-invalid={invalid && !name.trim()} aria-describedby={invalid ? 'reference-keyboard-error' : undefined} /></label>
					<label class="block space-y-2 text-sm"><span>{copy.email}</span><Input data-testid="reference-keyboard-email" bind:value={email} type="email" required disabled={pending} aria-invalid={invalid && !form?.querySelector<HTMLInputElement>('[type=email]')?.validity.valid} aria-describedby={invalid ? 'reference-keyboard-error' : undefined} /></label>
					<label class="block space-y-2 text-sm"><span>{copy.reason} · {copy.optional}</span><Textarea data-testid="reference-keyboard-multiline" bind:value={reason} disabled={pending} /></label>
					<div class="space-y-2"><p class="text-sm">{copy.className}</p><Popover.Popover bind:open={pickerOpen}><Popover.PopoverTrigger>{#snippet child({ props })}<Button {...props} variant="outline" disabled={pending} aria-label={`${copy.chooseClass}: ${className}`} data-testid="reference-keyboard-picker">{className}</Button>{/snippet}</Popover.PopoverTrigger><Popover.PopoverContent><p class="text-sm">{copy.chooseClass}</p>{#each ['6e A', '6e B'] as choice (choice)}<Button variant="ghost" onclick={() => {
						className = choice;
						pickerOpen = false;
					}}>{choice}</Button>{/each}</Popover.PopoverContent></Popover.Popover></div>
				{/if}
				{#if invalid}<p id="reference-keyboard-error" role="alert" class="text-sm text-destructive">{copy.invalidFields}</p>{/if}
				{#if pending}<p role="status" class="text-sm">{copy.pending}</p>{/if}
			</div>
			<footer class="flex flex-wrap justify-end gap-2 border-t pt-4">
				<Button variant="outline" data-testid="reference-keyboard-cancel" disabled={pending} onclick={requestClose}>{copy.cancel}</Button>
				{#if destructive}<Button variant="destructive-confirm" data-testid="reference-keyboard-confirm" onclick={() => {
					result = copy.deleted;
					open = false;
				}}>{copy.delete}</Button>{:else}<Button type="submit" disabled={loading || pending} aria-busy={pending} pendingLabel={copy.pending}>{copy.save}</Button>{/if}
			</footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
<Dialog.Root bind:open={discardOpen}>
	<Dialog.Content data-testid="reference-discard-dialog" onOpenAutoFocus={(event) => {
		event.preventDefault();
		document.querySelector<HTMLButtonElement>('[data-testid=reference-keep-editing]')?.focus();
	}}>
		<Dialog.Title>{copy.discardTitle}</Dialog.Title><Dialog.Description>{copy.reason}</Dialog.Description>
		<div class="flex flex-wrap justify-end gap-2"><Button variant="outline" data-testid="reference-keep-editing" onclick={() => discardOpen = false}>{copy.keepEditing}</Button><Button variant="destructive-confirm" onclick={() => {
			discardOpen = false;
			open = false;
		}}>{copy.discard}</Button></div>
	</Dialog.Content>
</Dialog.Root>
