<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { ACCOUNT_OPEN_PROFILE_PARAM } from '$lib/account/profile-navigation';
	import { bootstrapAppShell, resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
	import { shouldEnforceLoginGate } from '$lib/auth/enforce-login-gate';
	import { authSession } from '$lib/auth/session.svelte';
	import AccountProfileModal from '$lib/components/account/AccountProfileModal.svelte';
	import AcademicHeader from '$lib/components/layout/AcademicHeader.svelte';
	import AppSidebar from '$lib/components/layout/AppSidebar.svelte';
	import LanguageSelector from '$lib/components/layout/LanguageSelector.svelte';
	import SchoolSelector from '$lib/components/layout/SchoolSelector.svelte';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import { t } from '$lib/i18n';
	import { LoaderCircle, PanelLeft, PanelLeftClose } from '$lib/icons';
	import { DASHBOARD_HREF } from '$lib/navigation';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { canAccessPath } from '$lib/navigation/nav-permissions';
	import { onboardingContext } from '$lib/onboarding/context.svelte';
	import { onboardingResumePath } from '$lib/onboarding/resume-onboarding';
	import { shellContext } from '$lib/shell/context.svelte';
	import { cn } from '$lib/utils';

	const { children }: { children: Snippet } = $props();

	const me = $derived(authSession.accountActor);

	type ToastHostComponent = import('svelte').Component;

	let ToastHost = $state<ToastHostComponent | null>(null);
	let profileOpen = $state(false);

	$effect(() => {
		if (!authSession.ready) {
			return;
		}

		if (shouldEnforceLoginGate()) {
			appGoto(appPath('/login'), { replaceState: true });
			return;
		}

		if (authSession.needsOnboarding) {
			appGoto(appPath('/onboarding'), { replaceState: true });
			return;
		}

		const authUserId = authSession.authUserId;
		if (authUserId) {
			onboardingContext.init(authUserId);
		}

		const resumePath = onboardingResumePath(
			authSession.authUserId,
			authSession.schoolId,
			authSession.serverOnboardingStatus,
		);
		if (resumePath) {
			appGoto(resumePath, { replaceState: true });
			return;
		}

		if (!authSession.isLoggedIn) {
			appGoto(appPath('/login'), { replaceState: true });
		}
	});

	$effect(() => {
		if (!browser || !authSession.ready || !authSession.isLoggedIn) {
			return;
		}
		const pathname = $page.url.pathname;
		if (!canAccessPath(pathname, authSession.grants, { schoolId: authSession.schoolId ?? '' })) {
			appGoto(DASHBOARD_HREF, { replaceState: true });
		}
	});

	$effect(() => {
		if (!browser || !authSession.ready || !authSession.isLoggedIn) {
			return;
		}
		void bootstrapAppShell();
	});

	$effect(() => {
		if (!browser || $page.url.searchParams.get(ACCOUNT_OPEN_PROFILE_PARAM) !== '1') {
			return;
		}
		profileOpen = true;
		const next = new URL($page.url);
		next.searchParams.delete(ACCOUNT_OPEN_PROFILE_PARAM);
		const href = `${next.pathname}${next.search}` as ResolvedPathname;
		appGoto(href, { replaceState: true, keepFocus: true, noScroll: true });
	});

	$effect(() => {
		if (!browser || ToastHost) {
			return;
		}
		void import('$lib/components/ui/ToastHost.svelte').then((module) => {
			ToastHost = module.default;
		});
	});

	function logout() {
		resetAppShellBootstrap();
		authSession.logout();
		appGoto(appPath('/login'), { replaceState: true });
	}
</script>

{#if authSession.ready && authSession.isLoggedIn && me}
	<div class="flex h-screen w-full overflow-hidden bg-background text-foreground">
		<div
			class={cn(
				'relative h-full shrink-0 transition-[width] duration-200 ease-in-out',
				shellContext.sidebarOpen ? 'w-64' : 'w-14',
			)}
		>
			<AppSidebar
				hierarchy={academicContext.hierarchy}
				studentCount={academicContext.studentCount}
				guardianCount={academicContext.guardianCount}
				staffCount={academicContext.staffCount}
			/>
		</div>

		<div class="flex min-w-0 flex-1 flex-col">
			<div
				class="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-6"
			>
				<button
					type="button"
					onclick={() => shellContext.toggleSidebar()}
					class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/80 transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					aria-label={shellContext.sidebarOpen ? $t('sidebar.hide') : $t('sidebar.show')}
					aria-expanded={shellContext.sidebarOpen}
					aria-controls="app-sidebar"
				>
					{#if shellContext.sidebarOpen}
						<PanelLeftClose class="h-4 w-4" />
					{:else}
						<PanelLeft class="h-4 w-4" />
					{/if}
				</button>

				<div class="flex items-center gap-3">
					{#if academicContext.shellReady}
						<SchoolSelector schools={academicContext.schools} />
						<AcademicHeader />
					{:else}
						<LoaderCircle class="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
					{/if}
					<LanguageSelector />
					<div class="flex items-center gap-1.5">
						<button
							type="button"
							onclick={() => (profileOpen = true)}
							class="flex h-9 items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 text-xs font-medium text-foreground transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							aria-label={$t('account.profile.openProfile')}
							aria-haspopup="dialog"
							aria-expanded={profileOpen}
						>
							<PersonAvatar
								name={me.name}
								initials={me.initials}
								photoUrl={me.photoUrl}
								size="md"
							/>
							<span class="flex flex-col items-start leading-tight">
								<span class="text-[11px] font-semibold">{me.name}</span>
								<span class="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
									{$t(me.subtitleKey)}
								</span>
							</span>
						</button>
					</div>
				</div>
			</div>

			{@render children()}
		</div>
	</div>

	<AccountProfileModal bind:open={profileOpen} actor={me} onLogout={logout} />

	{#if ToastHost}
		<ToastHost />
	{/if}
{/if}
