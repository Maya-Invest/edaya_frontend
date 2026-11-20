<script lang="ts">
	import { t } from '$lib/i18n';
	import { LoaderCircle } from '$lib/icons';
</script>

<div class="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background text-muted-foreground"
	role="status" data-testid="app-shell-pending">
	<LoaderCircle class="h-8 w-8 text-primary motion-safe:animate-spin" aria-hidden="true" />
	<span class="text-sm">{$t('dataState.loading')}</span>
</div>
