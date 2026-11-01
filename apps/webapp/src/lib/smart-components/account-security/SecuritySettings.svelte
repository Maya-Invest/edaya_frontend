<script lang="ts">
	import { page } from '$app/state';
	import { authSession } from '$lib/auth/session.svelte';
	import AccountSettingsSection from '$lib/components/ui/AccountSettingsSection.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import { t } from '$lib/i18n';
	import { LogOut } from '$lib/icons';
	import { getDirtyWork } from '$lib/interaction/dirty-work.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import PasswordlessPanel from '$lib/smart-components/passwordless-panel/PasswordlessPanel.svelte';
	import { untrack, onDestroy } from 'svelte';
	import { SvelteURL } from 'svelte/reactivity';
	import { SecurityPage } from './security-page.svelte';

	const { embedded = false, onSignOut }: {
		embedded?: boolean;
		onSignOut?: () => void | Promise<void>;
	} = $props();
	const state = new SecurityPage();
	const dirtyWork = getDirtyWork();
	$effect(() => {
		void authSession.authUserId;
		untrack(() => {
			state.resetIdentity();
			void state.load();
		});
	});
	onDestroy(() => state.dispose());
	const removal = $derived(page.url.searchParams.get('unlink'));
	const removing = $derived(state.identifiers.find(item => item.id === removal));
	function guarded(proceed: () => void) {
		if (dirtyWork)
			dirtyWork.request(proceed);
		else
			proceed();
	}
	function selectRemoval(id: string | undefined = undefined) {
		const url = new SvelteURL(page.url);
		if (id)
			url.searchParams.set('unlink', id);
		else
			url.searchParams.delete('unlink');
		void appGoto(url.pathname + url.search, { noScroll: true, keepFocus: true });
	}
</script>

<AccountSettingsSection inset={!embedded} title={embedded ? undefined : $t('account.settings.tab.security')} description={embedded ? undefined : $t('account.settings.description.security')}>
	{#if state.error}<div role="alert" class="space-y-3 text-sm"><p class="text-destructive">{state.error}</p><Button variant="outline" disabled={state.busy} onclick={() => {
		if (state.accountChanged)
			window.location.reload();
		else void state.load();
	}}>{$t(state.accountChanged ? 'account.settings.reload' : 'dataState.retry')}</Button></div>{/if}
	{#if state.needsAuthentication}
		<section class="max-w-lg space-y-4"><h3 class="text-sm font-semibold">{$t('account.settings.verifyIdentity')}</h3><p class="text-sm text-muted-foreground">{$t('auth.recentSignInHint')}</p><PasswordlessPanel guard email={authSession.loginEmail ?? ''} onComplete={() => state.load()} /><Button variant="outline" onclick={() => guarded(() => {
			state.cancelAction();
			if (removal)
				selectRemoval();
		})}>{$t('common.cancel')}</Button></section>
	{:else if !state.loaded && state.busy}<p role="status" class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
	{:else if state.loaded && state.action}
		<section class="max-w-lg space-y-4">
			<div class="flex flex-wrap items-center justify-between gap-3"><h3 class="text-sm font-semibold">{$t(state.action === 'link' ? 'account.settings.addMethod' : 'auth.enableAuthenticator')}</h3><Button variant="outline" onclick={() => guarded(() => state.cancelAction())}>{$t('common.back')}</Button></div>
			{#if state.action === 'link'}<PasswordlessPanel guard link bind:email={state.linkEmail} bind:recoveryEligible={state.linkRecoveryEligible} onReauthenticationRequired={() => state.requireAuthentication()} onComplete={() => state.completeAction()} />
			{:else}<PasswordlessPanel guard enroll onReauthenticationRequired={() => state.requireAuthentication()} onComplete={() => state.completeAction()} />{/if}
		</section>
	{:else if state.loaded}
		<section class="space-y-4" aria-label={$t('account.settings.signInMethods')}>
			<div class="flex flex-wrap items-center justify-between gap-3"><h3 class="text-sm font-semibold">{$t('account.settings.signInMethods')}</h3><Button variant="outline" disabled={state.busy} onclick={() => state.begin('link')}>{$t('account.settings.addMethod')}</Button></div>
			<ul class="divide-y divide-border">
				{#each state.identifiers as identifier (identifier.id)}
					<li data-testid="account-identifier" class="flex items-start justify-between gap-4 py-4">
						<div class="min-w-0"><p class="text-xs text-muted-foreground">{$t(identifier.kind === 'phone' ? 'auth.phoneLabel' : 'account.notifications.loginEmail')}</p><p class="mt-1 break-all text-sm">{identifier.value}</p>{#if identifier.recoveryEligible}<p class="mt-1 text-xs text-muted-foreground">{$t('account.settings.recoveryAllowed')}</p>{/if}</div>
						<RowActionMenu label={$t('account.settings.methodActions', { value: identifier.value })}><Button variant="destructive" presentation="menu-item" class="h-auto w-full whitespace-normal" disabled={state.busy || !state.canUnlink(identifier.id)} onclick={() => selectRemoval(identifier.id)}>{$t('account.settings.removeMethod')}</Button>{#if !state.canUnlink(identifier.id)}<p class="p-2 text-xs text-muted-foreground">{$t('account.settings.keepRecovery')}</p>{/if}</RowActionMenu>
					</li>
				{/each}
			</ul>
			{#if !state.identifiers.length}<p class="text-sm text-muted-foreground">{$t('value.notProvided')}</p>{/if}
		</section>
		<section class="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6"><div class="min-w-0 max-w-full"><h3 class="text-sm font-semibold">{$t('account.settings.authenticator')}</h3><p data-testid="authenticator-state" class="mt-1 text-sm text-muted-foreground">{$t(state.totpEnabled ? 'auth.authenticatorEnabled' : 'account.settings.notConfigured')}</p></div>{#if !state.totpEnabled}<Button variant="outline" disabled={state.busy} onclick={() => state.begin('enroll')}>{$t('auth.enableAuthenticator')}</Button>{/if}</section>
		<p class="text-xs text-muted-foreground">{$t('account.settings.verificationHint')}</p>
	{/if}
	<section class="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6"><div class="min-w-0 max-w-full"><h3 class="text-sm font-semibold">{$t('account.settings.currentSession')}</h3><p class="mt-1 break-words text-sm text-muted-foreground">{authSession.loginEmail || $t('value.notProvided')}</p></div><Button variant="ghost" disabled={state.busy} onclick={() => guarded(() => {
		if (onSignOut)
			void onSignOut();
		else void state.signOut();
	})}><LogOut class="mr-2 h-4 w-4" />{$t('auth.signOut')}</Button></section>
</AccountSettingsSection>

<ConfirmModal open={Boolean(removing) && !state.needsAuthentication} title={$t('account.settings.removeMethod')} description={$t('auth.unlinkWarning')} target={removing?.value}
	confirmLabel={$t('auth.unlinkIdentifier')} cancelLabel={$t('common.cancel')} busy={state.busy} confirmDisabled={!removing || !state.canUnlink(removing.id)} errorMessage={state.error}
	onOpenChange={(open) => {
		if (!open)
			selectRemoval();
	}} onConfirm={async () => {
		if (removal)
			await state.unlink(removal);
	}} />
