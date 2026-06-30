<script lang="ts">
	import type { InvitationPreview } from '$lib/api/invitation-data';
	import { page } from '$app/stores';
	import { acceptInvitation, fetchInvitationPreview } from '$lib/api/invitation-data';
	import { isExistingAccountAuthError } from '$lib/auth/auth-errors';
	import { bootstrapSession, getAuthenticatedAuthUser } from '$lib/auth/bootstrap';
	import { resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
	import { authClient } from '$lib/auth/client';
	import { authSession } from '$lib/auth/session.svelte';
	import LanguageSelector from '$lib/components/layout/LanguageSelector.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { GraduationCap, LoaderCircle } from '$lib/icons';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { toast } from '$lib/toast.svelte';
	import { ApiError } from '@edaya/api-client';
	import { get } from 'svelte/store';

	function sessionBlocksInvitationAccept(
		preview: InvitationPreview,
	): boolean {
		if (!authSession.isLoggedIn || !authSession.userId || !authSession.sessionKind) {
			return false;
		}
		if (authSession.sessionKind !== preview.kind) {
			return true;
		}
		return authSession.userId !== preview.targetId;
	}

	function apiErrorMessage(err: ApiError): string {
		if (err.body && typeof err.body === 'object' && err.body !== null) {
			const payload = err.body as { message?: string; code?: string };
			if (payload.code === 'SUBJECT_ALREADY_LINKED') {
				return get(t)('invitation.accept.alreadyLinkedAccount');
			}
			if (payload.message) {
				return payload.message;
			}
		}
		return get(t)('invitation.accept.failed');
	}

	const token = $derived($page.params.token ?? '');

	type PageState = 'loading' | 'invalid' | 'notFound' | 'revoked' | 'expired' | 'accepted' | 'ready' | 'accepting';

	let preview = $state<InvitationPreview | null>(null);
	let pageState = $state<PageState>('loading');
	let authMode = $state<'signUp' | 'signIn'>('signUp');
	let email = $state('');
	let password = $state('');
	let name = $state('');
	let busy = $state(false);

	const actorKindLabel = $derived.by(() => {
		if (preview?.kind === 'staff') {
			return $t('invitation.kind.staff');
		}
		if (preview?.kind === 'guardian') {
			return $t('invitation.kind.guardian');
		}
		return $t('invitation.kind.student');
	});

	const wrongAccount = $derived(preview ? sessionBlocksInvitationAccept(preview) : false);
	const invitedEmail = $derived(preview?.contactEmail?.trim() ?? '');
	const useSignIn = $derived(preview?.authAccountExists === true || authMode === 'signIn');

	$effect(() => {
		if (pageState !== 'ready' || !preview) {
			return;
		}

		if (invitedEmail && !email.trim()) {
			email = invitedEmail;
		}
		if (preview.inviteeName && !name.trim()) {
			name = preview.inviteeName;
		}
		if (preview.authAccountExists) {
			authMode = 'signIn';
		}
	});

	$effect(() => {
		const currentToken = token;
		if (!currentToken) {
			pageState = 'notFound';
			return;
		}

		void (async () => {
			pageState = 'loading';
			try {
				const result = await fetchInvitationPreview(currentToken);
				preview = result;
				if (result.status === 'accepted') {
					pageState = 'accepted';
					return;
				}
				if (result.status === 'revoked') {
					pageState = 'revoked';
					return;
				}
				if (
					result.status === 'expired'
					|| (result.expiresAt && new Date(result.expiresAt) <= new Date())
				) {
					pageState = 'expired';
					return;
				}
				if (result.status !== 'pending' || !result.expiresAt) {
					pageState = 'invalid';
					return;
				}
				pageState = 'ready';
			}
			catch (err) {
				if (err instanceof ApiError && err.status === 404) {
					pageState = 'notFound';
					return;
				}
				pageState = 'invalid';
			}
		})();
	});

	async function signInWithEmail(): Promise<boolean> {
		const { error } = await authClient.signIn.email({
			email: email.trim(),
			password,
		});
		if (error) {
			toast.error(error.message ?? $t('invitation.accept.signInFailed'));
			return false;
		}
		return true;
	}

	async function authenticate(): Promise<boolean> {
		if (!useSignIn) {
			const { error } = await authClient.signUp.email({
				email: email.trim(),
				password,
				name: name.trim() || email.trim(),
			});
			if (error) {
				if (isExistingAccountAuthError(error)) {
					authMode = 'signIn';
					const signedIn = await signInWithEmail();
					if (!signedIn) {
						toast.error($t('invitation.accept.accountExistsSignIn'));
						return false;
					}
				}
				else {
					toast.error(error.message ?? $t('invitation.accept.signUpFailed'));
					return false;
				}
			}
		}
		else if (!(await signInWithEmail())) {
			return false;
		}

		const authUser = await getAuthenticatedAuthUser();
		if (!authUser) {
			toast.error($t('invitation.accept.sessionFailed'));
			return false;
		}
		return true;
	}

	async function handleAccept() {
		if (!token || !preview) {
			return;
		}

		busy = true;
		pageState = 'accepting';
		try {
			const authUser = await getAuthenticatedAuthUser();
			if (!authUser) {
				const authenticated = await authenticate();
				if (!authenticated) {
					pageState = 'ready';
					return;
				}
			}

			await acceptInvitation(token);
			resetAppShellBootstrap();
			await bootstrapSession();
			toast.success($t('invitation.accept.success'));
			await appGoto(appPath('/(app)/school/students/[[id]]'));
		}
		catch (err) {
			pageState = 'ready';
			if (err instanceof ApiError) {
				toast.error(apiErrorMessage(err));
			}
			else {
				toast.error($t('invitation.accept.failed'));
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<div class="flex min-h-screen flex-col bg-background text-foreground">
	<header class="flex items-center justify-end gap-3 border-b border-border bg-card/60 px-6 py-4 backdrop-blur">
		<LanguageSelector />
	</header>

	<main class="flex flex-1 items-center justify-center p-6">
		<div class="w-full max-w-lg animate-fade-in">
			<div class="mb-8 flex flex-col items-center text-center">
				<div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-panel">
					<GraduationCap class="h-7 w-7" />
				</div>
				<p class="font-mono text-xs uppercase tracking-widest text-muted-foreground">EDAYA</p>
				<h1 class="font-display text-3xl font-semibold">{$t('invitation.accept.title')}</h1>
			</div>

			<section class="rounded-2xl border border-border bg-card p-5 shadow-soft">
				{#if pageState === 'loading' || pageState === 'accepting'}
					<div class="flex flex-col items-center gap-3 py-8 text-sm text-muted-foreground">
						<LoaderCircle class="h-6 w-6 animate-spin" />
						<p>{pageState === 'accepting' ? $t('invitation.accept.linking') : $t('dataState.loading')}</p>
					</div>
				{:else if pageState === 'notFound'}
					<div class="space-y-2 py-4 text-center">
						<h2 class="font-display text-lg font-semibold">{$t('invitation.accept.notFoundTitle')}</h2>
						<p class="text-sm text-muted-foreground">{$t('invitation.accept.notFoundHint')}</p>
					</div>
				{:else if pageState === 'revoked'}
					<div class="space-y-2 py-4 text-center">
						<h2 class="font-display text-lg font-semibold">{$t('invitation.accept.revokedTitle')}</h2>
						<p class="text-sm text-muted-foreground">{$t('invitation.accept.revokedHint')}</p>
					</div>
				{:else if pageState === 'expired'}
					<div class="space-y-2 py-4 text-center">
						<h2 class="font-display text-lg font-semibold">{$t('invitation.accept.expiredTitle')}</h2>
						<p class="text-sm text-muted-foreground">{$t('invitation.accept.expiredHint')}</p>
					</div>
				{:else if pageState === 'invalid'}
					<div class="space-y-2 py-4 text-center">
						<h2 class="font-display text-lg font-semibold">{$t('invitation.accept.invalidTitle')}</h2>
						<p class="text-sm text-muted-foreground">{$t('invitation.accept.invalidHint')}</p>
					</div>
				{:else if pageState === 'accepted'}
					<div class="space-y-4 py-4 text-center">
						<h2 class="font-display text-lg font-semibold">{$t('invitation.accept.alreadyAcceptedTitle')}</h2>
						<p class="text-sm text-muted-foreground">{$t('invitation.accept.alreadyAcceptedHint')}</p>
						<Button type="button" onclick={() => appGoto('/login')}>
							{$t('invitation.accept.goToLogin')}
						</Button>
					</div>
				{:else if preview}
					<div class="space-y-4">
						{#if wrongAccount}
							<div class="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
								<p class="font-medium">{$t('invitation.accept.wrongAccountTitle')}</p>
								<p class="text-muted-foreground">{$t('invitation.accept.wrongAccountHint')}</p>
								<Button
									type="button"
									variant="outline"
									size="sm"
									class="rounded-full"
									onclick={async () => {
										await authSession.logout();
										resetAppShellBootstrap();
									}}
								>
									{$t('invitation.accept.signOut')}
								</Button>
							</div>
						{/if}

						<div class="rounded-xl bg-secondary/40 px-4 py-3 text-sm">
							<p class="font-medium">{preview.schoolName}</p>
							<p class="mt-1 text-muted-foreground">
								{$t('invitation.accept.summary', {
									name: preview.inviteeName,
									role: actorKindLabel,
								})}
							</p>
							<p class="mt-2 text-xs text-muted-foreground">
								{$t('invitation.accept.expires', {
									date: preview.expiresAt
										? new Date(preview.expiresAt).toLocaleString()
										: '—',
								})}
							</p>
						</div>

						{#if !authSession.isLoggedIn}
							{#if preview.authAccountExists}
								<p class="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
									{$t('invitation.accept.existingAccountHint')}
								</p>
							{:else}
								<div class="flex gap-2">
									<Button
										type="button"
										size="sm"
										variant={authMode === 'signUp' ? 'default' : 'outline'}
										onclick={() => (authMode = 'signUp')}
									>
										{$t('invitation.accept.signUp')}
									</Button>
									<Button
										type="button"
										size="sm"
										variant={authMode === 'signIn' ? 'default' : 'outline'}
										onclick={() => (authMode = 'signIn')}
									>
										{$t('invitation.accept.signIn')}
									</Button>
								</div>
							{/if}

							{#if !useSignIn}
								<div class="space-y-1.5">
									<Label>{$t('guardian.fullName')}</Label>
									<Input bind:value={name} autocomplete="name" />
								</div>
							{/if}

							<div class="space-y-1.5">
								<Label>{$t('common.email')}</Label>
								<Input
									type="email"
									bind:value={email}
									autocomplete="email"
									readonly={Boolean(invitedEmail)}
								/>
							</div>
							<div class="space-y-1.5">
								<Label>{$t('invitation.accept.password')}</Label>
								<Input type="password" bind:value={password} autocomplete={useSignIn ? 'current-password' : 'new-password'} />
								{#if !useSignIn}
									<p class="text-xs text-muted-foreground">{$t('invitation.accept.passwordHint')}</p>
								{/if}
							</div>
						{/if}

						<Button
							type="button"
							class="w-full"
							disabled={busy || wrongAccount || (!authSession.isLoggedIn && (!email.trim() || !password.trim()))}
							onclick={handleAccept}
						>
							{$t('invitation.accept.cta')}
						</Button>
					</div>
				{/if}
			</section>
		</div>
	</main>
</div>
