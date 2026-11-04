<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { PanelLeftClose } from '$lib/icons';
	import { Dialog } from 'bits-ui';
	import AppSidebar from './AppSidebar.svelte';

	let { open = $bindable(false), ...sidebar }: Omit<ComponentProps<typeof AppSidebar>, 'forceExpanded' | 'footerAction'> & { open?: boolean } = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-foreground/40" />
		<Dialog.Content
			aria-describedby={undefined}
			data-testid="mobile-navigation"
			class="ui-mobile-sidebar fixed inset-y-0 left-0 z-50 h-dvh w-[min(85vw,320px)] bg-card shadow-panel"
		>
			<Dialog.Title class="sr-only">{$t('sidebar.navigationTitle')}</Dialog.Title>
			<AppSidebar {...sidebar} forceExpanded>
				{#snippet footerAction()}
					<Dialog.Close>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" size="icon" aria-label={$t('sidebar.hide')}>
								<PanelLeftClose class="h-4 w-4" />
							</Button>
						{/snippet}
					</Dialog.Close>
				{/snippet}
			</AppSidebar>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
