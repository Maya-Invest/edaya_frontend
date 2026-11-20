<script lang="ts">
	import type { Snippet } from 'svelte';
	import LanguageSelector from '$lib/components/layout/LanguageSelector.svelte';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';
	import { t } from '$lib/i18n';
	import { tick } from 'svelte';

	export type AuthSplitPanel = 'signup' | 'signin';

	interface Props {
		activePanel: AuthSplitPanel;
		onPanelChange: (panel: AuthSplitPanel) => void;
		showSignup?: boolean;
		signup: Snippet;
		signin: Snippet;
		footer?: Snippet;
	}

	const { activePanel, onPanelChange, showSignup = true, signup, signin, footer }: Props = $props();
	let previousPanel: AuthSplitPanel | undefined;
	$effect(() => {
		const panel = activePanel;
		if (previousPanel && previousPanel !== panel) {
			void tick().then(() => document.getElementById(`${panel}-title`)?.focus());
		}
		previousPanel = panel;
	});
</script>

<div class="auth-page flex min-h-dvh flex-col bg-background text-foreground">
	<header class="flex items-center justify-end px-4 py-3 sm:px-6">
		<LanguageSelector />
	</header>
	<main class="flex flex-1 items-center justify-center px-4 pb-8 sm:px-6">
		<div class="w-full max-w-[1040px]">
			<div class="mb-4 flex justify-center lg:hidden">
				<BrandLogo variant="horizontal" width={144} />
			</div>
			<div class="overflow-hidden rounded-collection border border-border bg-card shadow-panel lg:grid lg:grid-cols-[40%_60%]">
				<aside class="hidden flex-col justify-center border-r border-border bg-background px-10 py-12 lg:flex">
					<div class="-ml-7 mb-8"><BrandLogo variant="vertical" width={144} /></div>
					<p class="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">{$t('auth.brandEyebrow')}</p>
					<h2 class="font-display text-[28px] font-semibold leading-tight text-foreground">{$t('auth.brandTitle')}</h2>
					<p class="mt-4 text-sm leading-relaxed text-muted-foreground">{$t('auth.brandDescription')}</p>
				</aside>
				<div class="px-5 py-6 sm:p-8 lg:px-10 lg:py-12">
					<!-- Keep panel instances stable so changing panels does not discard drafts. -->
					<section class="mx-auto w-full max-w-[420px]" hidden={activePanel !== 'signin'} inert={activePanel !== 'signin'} aria-labelledby="signin-title">
						<h1 id="signin-title" tabindex="-1" class="font-display text-2xl font-semibold leading-tight sm:text-[28px]">{$t('auth.signInTitle')}</h1>
						<p class="entry-guidance mb-6 mt-2 text-sm leading-relaxed text-muted-foreground">{$t('auth.signInDescription')}</p>
						{@render signin()}
						{#if showSignup}
							<p class="entry-guidance mt-6 text-sm text-muted-foreground">
								{$t('auth.noAccountYet')}
								<button type="button" class="control-focus ml-1 rounded font-medium text-primary underline-offset-4 hover:underline" onclick={() => onPanelChange('signup')}>
									{$t('auth.switchToSignUp')}
								</button>
							</p>
						{/if}
					</section>
					{#if showSignup}
						<section class="mx-auto w-full max-w-[420px]" hidden={activePanel !== 'signup'} inert={activePanel !== 'signup'} aria-labelledby="signup-title">
							<h1 id="signup-title" tabindex="-1" class="font-display text-2xl font-semibold leading-tight sm:text-[28px]">{$t('auth.signUpTitle')}</h1>
							<p class="entry-guidance mb-6 mt-2 text-sm leading-relaxed text-muted-foreground">{$t('auth.signUpSubtitle')}</p>
							{@render signup()}
							<p class="entry-guidance mt-6 text-sm text-muted-foreground">
								{$t('auth.alreadyHaveAccount')}
								<button type="button" class="control-focus ml-1 rounded font-medium text-primary underline-offset-4 hover:underline" onclick={() => onPanelChange('signin')}>
									{$t('auth.switchToSignIn')}
								</button>
							</p>
						</section>
					{/if}
				</div>
			</div>
			{#if footer}
				<div class="mt-5 text-center text-sm">{@render footer()}</div>
			{/if}
		</div>
	</main>
</div>

<style>
  section:has(:global([data-testid="auth-panel"]:not([data-state="form"]))) .entry-guidance {
    display: none;
  }
  section:has(:global([data-testid="auth-panel"]:not([data-state="form"]))) h1 {
    margin-bottom: 1rem;
  }
</style>
