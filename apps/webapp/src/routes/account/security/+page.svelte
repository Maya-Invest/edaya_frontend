<script lang="ts">
	import { page } from '$app/state';
	import PasswordlessPanel from '$lib/components/auth/login/PasswordlessPanel.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { t } from '$lib/i18n';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { SecurityPage } from './security-page.svelte';

	const state = new SecurityPage();
	const removal = $derived(page.url.searchParams.get('unlink'));
	function selectRemoval(id: string | undefined = undefined) {
		const url = new URL(page.url);
		if (id)
			url.searchParams.set('unlink', id);
		else url.searchParams.delete('unlink');
		void appGoto(appPath('/account/security') + url.search, { noScroll: true, keepFocus: true });
	}
</script>
<main class="mx-auto max-w-xl space-y-6 p-6">
	<h1 class="font-display text-2xl font-semibold">{$t('auth.accountSecurity')}</h1>
	<p class="text-sm text-muted-foreground">{$t('auth.recentSignInHint')}</p>
	<Button disabled={state.busy} onclick={() => void state.load()}>{$t('auth.showSecurity')}</Button>
	{#if state.needsAuthentication}<PasswordlessPanel onComplete={() => state.load()} />{/if}
	{#if state.loaded && !state.needsAuthentication}
		<Button variant="outline" onclick={() => { state.needsAuthentication = true; }}>{$t('auth.signInTitle')}</Button>
		<ul class="space-y-3">{#each state.identifiers as identifier (identifier.id)}<li data-testid="account-identifier" class="flex items-center justify-between gap-4"><span>{identifier.value}</span><Button variant="outline" onclick={() => selectRemoval(identifier.id)}>{$t('auth.unlinkIdentifier')}</Button></li>{/each}</ul>
		<h2 class="text-lg font-semibold">{$t('auth.linkIdentifier')}</h2>
		<PasswordlessPanel link onComplete={() => state.load()} />
		{#if !state.totpEnabled}
			<h2 class="text-lg font-semibold">{$t('auth.enableAuthenticator')}</h2>
			<PasswordlessPanel enroll onComplete={() => state.load()} />
		{:else}<p data-testid="totp-enabled">{$t('auth.authenticatorEnabled')}</p>{/if}
	{/if}
</main>

<ConfirmModal open={!!removal} title={$t('auth.unlinkIdentifier')} description={$t('auth.unlinkWarning')}
	confirmLabel={$t('auth.unlinkIdentifier')} cancelLabel={$t('common.cancel')} busy={state.busy}
	onOpenChange={(open) => {
		if (!open)
			selectRemoval();
	}}
	onConfirm={async () => {
		if (removal)
			await state.unlink(removal);
	}} />
