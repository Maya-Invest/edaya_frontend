<script lang="ts">
	import type { InvitationPreview } from '$lib/api/invitation-data';
	import type {
		InvitationAuthMode,
		InvitationAuthStage,
	} from './invitation-auth-url';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { acceptInvitation, fetchInvitationPreview } from '$lib/api/invitation-data';
	import { isExistingAccountAuthError } from '$lib/auth/auth-errors';
	import { bootstrapSession, getAuthenticatedAuthUser } from '$lib/auth/bootstrap';
	import { resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
	import { authClient } from '$lib/auth/client';
	import {
		clearPendingInviteToken,
		persistPendingInviteToken,
	} from '$lib/auth/pending-invite-token';
	import { resolveLinkedActorPath } from '$lib/auth/resolve-post-auth';
	import { authSession } from '$lib/auth/session.svelte';
	import LanguageSelector from '$lib/components/layout/LanguageSelector.svelte';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { LoaderCircle, Mail } from '$lib/icons';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { toast } from '$lib/toast.svelte';
	import { ApiError } from '@maya-invest/edaya-api-client';
	import { get } from 'svelte/store';
	import {
		canonicalInvitationAuthUrlState,
		readInvitationAuthUrlState,
		writeInvitationAuthUrlState,
	} from './invitation-auth-url';

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
			if (payload.code === 'INVITATION_ALREADY_ACCEPTED') {
				return get(t)('invitation.accept.alreadyAcceptedOtherAccountHint');
			}
			if (payload.message) {
				return payload.message;
			}
		}
		return get(t)('invitation.accept.failed');
	}

	const token = $derived($page.params.token ?? '');

	type PageState = 'loading' | 'invalid' | 'notFound' | 'revoked' | 'expired' | 'accepted' | 'ready' | 'accepting' | 'teacherLinked';
	type AcceptedIssue = 'none' | 'otherAccount' | 'stillUnlinked';

	let preview = $state<InvitationPreview | null>(null);
	let pageState = $state<PageState>('loading');
	let acceptedIssue = $state<AcceptedIssue>('none');
	let acceptedCompletionAttempted = $state(false);
	let email = $state('');
	let password = $state('');
	let name = $state('');
	let busy = $state(false);
	const authUrlState = $derived(readInvitationAuthUrlState($page.url));
	const authMode = $derived(authUrlState.mode);
	const verificationSent = $derived(
		authUrlState.stage === 'verification' && email.trim().length > 0,
	);

	const actorKindLabel = $derived.by(() => {
		if (preview?.kind === 'staff') {
			return $t('invitation.kind.staff');
		}
		if (preview?.kind === 'guardian') {
			return $t('invitation.kind.guardian');
		}
		if (preview?.kind === 'teacher') {
			return $t('invitation.kind.teacher');
		}
		return $t('invitation.kind.student');
	});

	type InvitationKind = InvitationPreview['kind'];
	type BootstrapSession = NonNullable<Awaited<ReturnType<typeof bootstrapSession>>['session']>;

	function isTeacherInvitation(kind: InvitationKind | null | undefined): boolean {
		return kind === 'teacher';
	}

	function completeInvitationAccept(session: BootstrapSession) {
		clearPendingInviteToken();
		if (isTeacherInvitation(session.kind)) {
			toast.success($t('invitation.accept.teacherSuccess'));
			pageState = 'teacherLinked';
			return;
		}
		toast.success($t('invitation.accept.success'));
		void appGoto(resolveLinkedActorPath(session));
	}

	const wrongAccount = $derived(preview ? sessionBlocksInvitationAccept(preview) : false);
	const invitedEmail = $derived(preview?.contactEmail?.trim() ?? '');
	const useSignIn = $derived(preview?.authAccountExists === true || authMode === 'signIn');

	function setInvitationAuthState(
		patch: Partial<{ mode: InvitationAuthMode; stage: InvitationAuthStage }>,
		options: { replaceState?: boolean } = {},
	) {
		const href = writeInvitationAuthUrlState($page.url, { ...authUrlState, ...patch });
		if (href === `${$page.url.pathname}${$page.url.search}`) {
			return;
		}
		void appGoto(href, {
			keepFocus: true,
			noScroll: true,
			replaceState: options.replaceState,
		});
	}

	function prepareReadyInvitation(result: InvitationPreview) {
		const restoredEmail = result.contactEmail?.trim() ?? '';
		if (restoredEmail && !email.trim()) {
			email = restoredEmail;
		}
		if (result.inviteeName && !name.trim()) {
			name = result.inviteeName;
		}

		const nextAuthState = canonicalInvitationAuthUrlState(
			result.authAccountExists
				? { mode: 'signIn', stage: 'form' }
				: authUrlState,
			{ hasEmailIdentity: email.trim().length > 0 },
		);
		if (
			nextAuthState.mode !== authUrlState.mode
			|| nextAuthState.stage !== authUrlState.stage
		) {
			setInvitationAuthState(nextAuthState, { replaceState: true });
		}
	}

	afterNavigate(() => {
		const canonicalHref = writeInvitationAuthUrlState($page.url, authUrlState);
		if (canonicalHref !== `${$page.url.pathname}${$page.url.search}`) {
			void appGoto(canonicalHref, {
				replaceState: true,
				keepFocus: true,
				noScroll: true,
			});
		}
	});

	$effect(() => {
		const currentToken = token;
		if (!currentToken) {
			return;
		}
		persistPendingInviteToken(currentToken);
	});

	$effect(() => {
		const currentToken = token;
		if (
			pageState !== 'accepted'
			|| !currentToken
			|| acceptedCompletionAttempted
			|| !authSession.ready
		) {
			return;
		}

		void (async () => {
			const authUser = await getAuthenticatedAuthUser();
			if (!authUser) {
				return;
			}

			acceptedCompletionAttempted = true;
			pageState = 'accepting';
			acceptedIssue = 'none';

			try {
				await acceptInvitation(currentToken);
				resetAppShellBootstrap();
				const { session, pendingOnboarding } = await bootstrapSession();
				if (!pendingOnboarding && session) {
					completeInvitationAccept(session);
					return;
				}

				acceptedIssue = 'stillUnlinked';
				pageState = 'accepted';
				toast.error($t('invitation.accept.alreadyAcceptedStillUnlinkedHint'));
			}
			catch (err) {
				pageState = 'accepted';
				if (err instanceof ApiError) {
					const payload = err.body as { code?: string } | undefined;
					if (payload?.code === 'INVITATION_ALREADY_ACCEPTED') {
						acceptedIssue = 'otherAccount';
						toast.error($t('invitation.accept.alreadyAcceptedOtherAccountHint'));
						return;
					}
					toast.error(apiErrorMessage(err));
					return;
				}
				toast.error($t('invitation.accept.failed'));
			}
		})();
	});

	$effect(() => {
		const currentToken = token;
		if (!currentToken) {
			pageState = 'notFound';
			return;
		}

		void (async () => {
			pageState = 'loading';
			acceptedIssue = 'none';
			acceptedCompletionAttempted = false;
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
				prepareReadyInvitation(result);
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
		if (verificationSent) {
			setInvitationAuthState({ stage: 'form' }, { replaceState: true });
		}
		if (!useSignIn) {
			const { error } = await authClient.signUp.email({
				email: email.trim(),
				password,
				name: name.trim() || email.trim(),
			});
			if (error) {
				// Parallel submit race: another request may already have established the session.
				const racedAuthUser = await getAuthenticatedAuthUser();
				if (!racedAuthUser) {
					if (isExistingAccountAuthError(error)) {
						setInvitationAuthState({ mode: 'signIn', stage: 'form' });
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
		}
		else if (!(await signInWithEmail())) {
			return false;
		}

		const authUser = await getAuthenticatedAuthUser();
		if (!authUser) {
			if (!useSignIn) {
				setInvitationAuthState({ stage: 'verification' });
				toast.success($t('auth.signUpVerificationSent'));
				return false;
			}
			toast.error($t('invitation.accept.sessionFailed'));
			return false;
		}

		authSession.setAuthAccountOnly({
			authUserId: authUser.id,
			loginEmail: authUser.email ?? null,
		});
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
			const { session, pendingOnboarding } = await bootstrapSession();
			if (pendingOnboarding || !session) {
				pageState = 'ready';
				toast.error($t('invitation.accept.alreadyAcceptedStillUnlinkedHint'));
				return;
			}
			completeInvitationAccept(session);
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
				<BrandLogo variant="horizontal" width={144} />
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
				{:else if pageState === 'teacherLinked'}
					<div class="space-y-4 py-4 text-center">
						<h2 class="font-display text-lg font-semibold">
							{$t('invitation.accept.teacherLinkedTitle')}
						</h2>
						<p class="text-sm text-muted-foreground">
							{$t('auth.teacherPortalGateHint')}
						</p>
					</div>
				{:else if pageState === 'accepted'}
					<div class="space-y-4 py-4 text-center">
						{#if acceptedIssue === 'otherAccount'}
							<h2 class="font-display text-lg font-semibold">
								{$t('invitation.accept.alreadyAcceptedOtherAccountTitle')}
							</h2>
							<p class="text-sm text-muted-foreground">
								{$t('invitation.accept.alreadyAcceptedOtherAccountHint')}
							</p>
						{:else if acceptedIssue === 'stillUnlinked'}
							<h2 class="font-display text-lg font-semibold">
								{$t('invitation.accept.alreadyAcceptedTitle')}
							</h2>
							<p class="text-sm text-muted-foreground">
								{$t('invitation.accept.alreadyAcceptedStillUnlinkedHint')}
							</p>
						{:else}
							<h2 class="font-display text-lg font-semibold">
								{$t('invitation.accept.alreadyAcceptedTitle')}
							</h2>
							<p class="text-sm text-muted-foreground">
								{$t('invitation.accept.alreadyAcceptedHint')}
							</p>
						{/if}
						{#if !authSession.hasAuthAccount}
							<Button
								type="button"
								onclick={() => {
									persistPendingInviteToken(token);
									void appGoto('/login');
								}}
							>
								{$t('invitation.accept.goToLogin')}
							</Button>
						{/if}
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

						{#if verificationSent}
							<div class="space-y-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm">
								<div class="flex items-start gap-3">
									<Mail class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
									<div class="space-y-1.5 text-left">
										<p class="font-medium">{$t('auth.signUpVerificationTitle')}</p>
										<p class="text-muted-foreground">
											{$t('invitation.accept.verificationHint', { email: email.trim() })}
										</p>
									</div>
								</div>
								<Button
									type="button"
									variant="outline"
									class="w-full"
									onclick={() => {
										setInvitationAuthState({ mode: 'signIn', stage: 'form' });
									}}
								>
									{$t('auth.switchToSignIn')}
								</Button>
							</div>
						{/if}

						{#if !authSession.isLoggedIn && !verificationSent}
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
										onclick={() => setInvitationAuthState({ mode: 'signUp', stage: 'form' })}
									>
										{$t('invitation.accept.signUp')}
									</Button>
									<Button
										type="button"
										size="sm"
										variant={authMode === 'signIn' ? 'default' : 'outline'}
										onclick={() => setInvitationAuthState({ mode: 'signIn', stage: 'form' })}
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
							disabled={busy || wrongAccount || verificationSent || (!authSession.isLoggedIn && (!email.trim() || !password.trim()))}
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
