<script lang="ts">
	import { dev } from '$app/environment';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import { t } from '$lib/i18n';
	import { onMount, untrack } from 'svelte';
	import { TeacherQuickLoginState } from '../teacher-quick-login-state.svelte';

	const { teacherId }: { teacherId: string } = $props();
	const state = new TeacherQuickLoginState(untrack(() => teacherId));
	const labels = { week: 'quick.week', month: 'quick.month', period: 'quick.period', year: 'quick.year', none: 'quick.none' } as const;
	onMount(() => {
		state.start();
		document.addEventListener('visibilitychange', state.clear);
		return () => {
			state.dispose();
			document.removeEventListener('visibilitychange', state.clear);
		};
	});
</script>

{#if !state.hidden}
	<section class="space-y-3 rounded-collection border border-border bg-card p-4">
		<h3 class="font-semibold">{$t('quick.title')}</h3>
		{#if state.options}
			{#if state.options.active}
				<p>{state.options.active.channel} · {state.options.active.hint} · {state.options.active.expiry ? new Date(state.options.active.expiry).toLocaleString() : $t('quick.none')}</p>
			{/if}
			{#if state.options.contacts.length}
				<Button disabled={state.busy} onclick={state.show}>{$t(state.options.active ? 'quick.refresh' : 'quick.generate')}</Button>
				<FormModal bind:open={state.open} title={$t(state.options.active ? 'quick.refresh' : 'quick.generate')} submitLabel={$t(state.options.active ? 'quick.refresh' : 'quick.generate')} busy={state.busy} submitDisabled={!state.identifierId || !(state.expiry in state.options.expiries)} onSubmit={state.issue}>
					<label class="block">{$t('quick.destination')}
						<SelectField aria-label={$t('quick.destination')} bind:value={state.identifierId} disabled={state.busy} class="block rounded-md border p-2">
							{#each state.options.contacts as contact (contact.id)}<option value={contact.id}>{contact.channel} · {contact.hint}</option>{/each}
						</SelectField>
					</label>
					<label class="block">{$t('quick.expiry')}
						<SelectField aria-label={$t('quick.expiry')} bind:value={state.expiry} disabled={state.busy} class="block rounded-md border p-2">
							{#each Object.entries(labels) as [value, label] (value)}<option {value} disabled={!(value in state.options.expiries)}>{$t(label)}</option>{/each}
						</SelectField>
					</label>
					{#if state.options.expiries[state.expiry]}<p>{new Date(state.options.expiries[state.expiry]!).toLocaleString()}</p>{/if}
				</FormModal>
			{:else}<p>{$t('quick.noContact')}</p>{/if}
			{#if dev && state.canReveal && state.options.active}
				<Button variant="outline" disabled={state.busy} onclick={state.reveal}>{$t('quick.reveal')}</Button>
				{#if state.code}<output class="font-mono">{state.code}</output>{/if}
			{/if}
		{/if}
		{#if state.notice}<p role="status">{$t(state.notice)}</p>{/if}
	</section>
{/if}
