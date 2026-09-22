<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { authSession } from '$lib/auth/session.svelte';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { hasAnyPermission } from '$lib/permissions';
	import { OTHER_CONFIG_ENTRIES } from './lib/other-config-catalog';

	$effect(() => {
		if (!authSession.ready) {
			return;
		}
		const next = OTHER_CONFIG_ENTRIES.find(entry => hasAnyPermission(entry.permissions));
		if (!next) {
			return;
		}
		void appGoto(`${resolve(next.href)}${$page.url.search}`, { replaceState: true });
	});
</script>

<p class="text-sm text-muted-foreground">{$t('config.other')}</p>
