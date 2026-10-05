<script lang="ts">
	import type { InvitationPreview } from '$lib/api/invitation-data';
	import type {
		InvitationAuthMode,
		InvitationAuthStage,
	} from '../invitation-auth-url';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { GUARDIAN_PLAY_STORE_URL } from '$lib/auth/guardian-app';
	import {
		clearPendingInviteToken,
		clearPendingInviteTokenIf,
		discardPendingInviteToken,
		persistPendingInviteToken,
	} from '$lib/auth/pending-invite-token';
	import { ONBOARDING_PATH, resolvePostAuthPath } from '$lib/auth/resolve-post-auth';
	import { authSession } from '$lib/auth/session.svelte';
	import LanguageSelector from '$lib/components/layout/LanguageSelector.svelte';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { LoaderCircle } from '$lib/icons';
	import { appGoto } from '$lib/navigation/app-navigation';
	import PasswordlessPanel from '$lib/smart-components/passwordless-panel/PasswordlessPanel.svelte';
	import { toast } from '$lib/toast.svelte';
	import { ApiError } from '@maya-invest/edaya-api-client';
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import {
		canonicalInvitationAuthUrlState,
		invitationTokenFromRoute,
		isInvitationRoute,
		readInvitationAuthUrlState,
		writeInvitationAuthUrlState,
	} from '../invitation-auth-url';

	import { InvitationPageState } from '../invitation-page';

	const invitationPage = new InvitationPageState();

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

	const token = $derived(invitationTokenFromRoute($page.params.token));

	type PageState = 'loading' | 'invalid' | 'loadFailed' | 'notFound' | 'revoked' | 'expired' | 'accepted' | 'ready' | 'accepting' | 'teacherLinked' | 'guardianLinked' | 'studentLinked';
	type AcceptedIssue = 'none' | 'otherAccount' | 'stillUnlinked' | 'contactMismatch';

	let preview = $state<InvitationPreview | null>(null);
	let pageState = $state<PageState>('loading');
	let acceptedIssue = $state<AcceptedIssue>('none');
	let acceptCommitted = $state(false);
	let previewReload = $state(0);
	let email = $state('');
	let busy = $state(false);
	let acceptInFlight = false;
	const authUrlState = $derived(readInvitationAuthUrlState($page.url));

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
	type BootstrapSession = NonNullable<Awaited<ReturnType<InvitationPageState['reloadLinkedSession']>>['session']>;

	function isTeacherInvitation(kind: InvitationKind | null | undefined): boolean {
		return kind === 'teacher';
	}

	function isGuardianInvitation(kind: InvitationKind | null | undefined): boolean {
		return kind === 'guardian';
	}

	function isStudentInvitation(kind: InvitationKind | null | undefined): boolean {
		return kind === 'student';
	}

	async function completeInvitationAccept(session: BootstrapSession) {
		clearPendingInviteToken();
		if (isTeacherInvitation(session.kind)) {
			toast.success($t('invitation.accept.teacherSuccess'));
			pageState = 'teacherLinked';
			return;
		}
		if (isGuardianInvitation(session.kind)) {
			toast.success($t('invitation.accept.guardianSuccess'));
			pageState = 'guardianLinked';
			return;
		}
		if (isStudentInvitation(session.kind)) {
			toast.success($t('invitation.accept.studentSuccess'));
			pageState = 'studentLinked';
			return;
		}
		toast.success($t('invitation.accept.success'));
		await appGoto(resolvePostAuthPath({
			session,
			pendingOnboarding: false,
			authUserId: authSession.authUserId,
		}));
	}

	const wrongAccount = $derived(preview ? sessionBlocksInvitationAccept(preview) : false);

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

		const nextAuthState = canonicalInvitationAuthUrlState(
			result.authAccountExists
				? { mode: 'signIn', stage: 'form',
				}
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

	afterNavigate((navigation) => {
		const url = navigation.to?.url ?? $page.url;
		if (!isInvitationRoute(url.pathname)) {
			return;
		}
		const canonicalHref = writeInvitationAuthUrlState(url, authUrlState);
		if (canonicalHref !== `${url.pathname}${url.search}`) {
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
		if (pageState === 'ready' && preview?.status === 'pending') {
			persistPendingInviteToken(currentToken);
			return;
		}
		if (
			pageState === 'invalid'
			|| pageState === 'notFound'
			|| pageState === 'revoked'
			|| pageState === 'expired'
			|| pageState === 'accepted'
		) {
			clearPendingInviteTokenIf(currentToken);
		}
	});

	$effect(() => {
		const currentToken = token;
		const request = { cancelled: false, attempt: previewReload };
		if (!currentToken) {
			pageState = 'notFound';
			return;
		}

		// Only the token and explicit retry own preview loading. Transport reads of
		// reactive auth state must not reload a just-accepted invitation.
		void untrack(async () => {
			pageState = 'loading';
			acceptedIssue = 'none';
			acceptCommitted = false;
			try {
				const result = await invitationPage.loadPreview(currentToken);
				if (request.cancelled) {
					return;
				}
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
				if (request.cancelled) {
					return;
				}
				if (err instanceof ApiError && err.status === 404) {
					pageState = 'notFound';
					return;
				}
				pageState = 'loadFailed';
			}
		});

		return () => {
			request.cancelled = true;
		};
	});

	async function retryLinkedSession(): Promise<boolean> {
		const { session, pendingOnboarding } = await invitationPage.reloadLinkedSession();
		if (pendingOnboarding || !session) {
			acceptedIssue = 'stillUnlinked';
			pageState = 'accepted';
			toast.error($t('invitation.accept.alreadyAcceptedStillUnlinkedHint'));
			return false;
		}
		await completeInvitationAccept(session);
		return true;
	}

	async function handleAccept() {
		if (!token || !preview || acceptInFlight) {
			return;
		}

		acceptInFlight = true;
		busy = true;
		pageState = 'accepting';
		try {
			if (acceptCommitted) {
				await retryLinkedSession();
				return;
			}

			if (!await invitationPage.authenticate()) {
				pageState = 'ready';
				return;
			}

			await invitationPage.accept(token);
			acceptCommitted = true;
			clearPendingInviteTokenIf(token);
			await retryLinkedSession();
		}
		catch (err) {
			if (acceptCommitted) {
				acceptedIssue = 'stillUnlinked';
				pageState = 'accepted';
			}
			else {
				pageState = 'ready';
			}
			if (err instanceof ApiError) {
				if (JSON.stringify(err.body).includes('INVITATION_CONTACT_MISMATCH'))
					acceptedIssue = 'contactMismatch';
				toast.error(apiErrorMessage(err));
			}
			else {
				toast.error($t('invitation.accept.failed'));
			}
		}
		finally {
			busy = false;
			acceptInFlight = false;
		}
	}
</script>

<div class="flex min-h-screen flex-col bg-background text-foreground">
	<header class="flex items-center justify-end gap-3 border-b border-border bg-card/60 px-6 py-4 backdrop-blur">
		{#if authSession.hasAuthAccount}<a href="/account/security" target="_blank" rel="noopener" class="text-sm text-primary">{$t('auth.accountSecurity')}</a>{/if}
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
					<div class="space-y-4 py-4 text-center">
						<h2 class="font-display text-lg font-semibold">{$t('invitation.accept.notFoundTitle')}</h2>
						<p class="text-sm text-muted-foreground">{$t('invitation.accept.notFoundHint')}</p>
						<Button
							type="button"
							variant="outline"
							onclick={() => {
								discardPendingInviteToken();
								void appGoto(ONBOARDING_PATH);
							}}
						>
							{$t('invitation.accept.startOnboarding')}
						</Button>
					</div>
				{:else if pageState === 'revoked'}
					<div class="space-y-4 py-4 text-center">
						<h2 class="font-display text-lg font-semibold">{$t('invitation.accept.revokedTitle')}</h2>
						<p class="text-sm text-muted-foreground">{$t('invitation.accept.revokedHint')}</p>
						<Button
							type="button"
							variant="outline"
							onclick={() => {
								discardPendingInviteToken();
								void appGoto(ONBOARDING_PATH);
							}}
						>
							{$t('invitation.accept.startOnboarding')}
						</Button>
					</div>
				{:else if pageState === 'expired'}
					<div class="space-y-4 py-4 text-center">
						<h2 class="font-display text-lg font-semibold">{$t('invitation.accept.expiredTitle')}</h2>
						<p class="text-sm text-muted-foreground">{$t('invitation.accept.expiredHint')}</p>
						<Button
							type="button"
							variant="outline"
							onclick={() => {
								discardPendingInviteToken();
								void appGoto(ONBOARDING_PATH);
							}}
						>
							{$t('invitation.accept.startOnboarding')}
						</Button>
					</div>
				{:else if pageState === 'invalid'}
					<div class="space-y-4 py-4 text-center">
						<h2 class="font-display text-lg font-semibold">{$t('invitation.accept.invalidTitle')}</h2>
						<p class="text-sm text-muted-foreground">{$t('invitation.accept.invalidHint')}</p>
						<Button
							type="button"
							variant="outline"
							onclick={() => {
								discardPendingInviteToken();
								void appGoto(ONBOARDING_PATH);
							}}
						>
							{$t('invitation.accept.startOnboarding')}
						</Button>
					</div>
				{:else if pageState === 'loadFailed'}
					<div class="space-y-4 py-4 text-center">
						<h2 class="font-display text-lg font-semibold">{$t('invitation.accept.loadFailedTitle')}</h2>
						<p class="text-sm text-muted-foreground">{$t('invitation.accept.loadFailedHint')}</p>
						<Button type="button" onclick={() => { previewReload += 1; }}>
							{$t('invitation.accept.retry')}
						</Button>
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
				{:else if pageState === 'guardianLinked'}
					<div class="space-y-4 py-4 text-center">
						<h2 class="font-display text-lg font-semibold">
							{$t('invitation.accept.guardianLinkedTitle')}
						</h2>
						<p class="text-sm text-muted-foreground">
							{$t('auth.guardianPortalGateHint')}
						</p>
						<div class="space-y-2 text-left">
							<p class="text-sm font-medium">{$t('invitation.accept.guardianGetAppTitle')}</p>
							<p class="text-sm text-muted-foreground">{$t('invitation.accept.guardianGetAppHint')}</p>
							<a
								class={buttonVariants({ class: 'w-full' })}
								href={GUARDIAN_PLAY_STORE_URL}
								target="_blank"
								rel="noopener noreferrer"
							>
								{$t('invitation.accept.guardianGetAppPlayStore')}
							</a>
							<p class="text-xs text-muted-foreground">
								{$t('invitation.accept.guardianGetAppAppStore')}
							</p>
						</div>
					</div>
				{:else if pageState === 'studentLinked'}
					<div class="space-y-4 py-4 text-center">
						<h2 class="font-display text-lg font-semibold">
							{$t('invitation.accept.studentLinkedTitle')}
						</h2>
						<p class="text-sm text-muted-foreground">
							{$t('auth.studentPortalGateHint')}
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
							<Button
								type="button"
								onclick={() => {
									void handleAccept();
								}}
							>
								{$t('invitation.accept.retryLinking')}
							</Button>
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
									discardPendingInviteToken();
									void appGoto('/login');
								}}
							>
								{$t('invitation.accept.goToLogin')}
							</Button>
						{/if}
					</div>
				{:else if preview}
					<div class="space-y-4">
						{#if wrongAccount || acceptedIssue === 'contactMismatch'}
							<div class="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
								<p class="font-medium">
									{$t(acceptedIssue === 'contactMismatch'
										? 'invitation.accept.contactMismatchTitle'
										: 'invitation.accept.wrongAccountTitle')}
								</p>
								<p class="text-muted-foreground">
									{$t(acceptedIssue === 'contactMismatch'
										? 'invitation.accept.contactMismatchHint'
										: 'invitation.accept.wrongAccountHint')}
								</p>
								<Button
									type="button"
									variant="outline"
									size="sm"
									class="rounded-full"
									onclick={async () => {
										await invitationPage.logout();
										acceptedIssue = 'none';
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

						{#if isGuardianInvitation(preview.kind)}
							<div class="space-y-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm">
								<p class="font-medium">{$t('invitation.accept.guardianGetAppTitle')}</p>
								<p class="text-muted-foreground">{$t('invitation.accept.guardianGetAppHint')}</p>
								<a
									class={buttonVariants({ variant: 'outline', class: 'w-full' })}
									href={GUARDIAN_PLAY_STORE_URL}
									target="_blank"
									rel="noopener noreferrer"
								>
									{$t('invitation.accept.guardianGetAppPlayStore')}
								</a>
								<p class="text-xs text-muted-foreground">
									{$t('invitation.accept.guardianGetAppAppStore')}
								</p>
							</div>
						{/if}

						{#if !authSession.hasAuthAccount}
							<PasswordlessPanel bind:email onComplete={async () => { await invitationPage.authenticate(); }} />
						{/if}

						<Button
							type="button"
							class="w-full"
							disabled={busy || wrongAccount || acceptedIssue === 'contactMismatch' || !authSession.hasAuthAccount}
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
