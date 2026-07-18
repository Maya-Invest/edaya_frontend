<script lang="ts">
	import DataImportModal from '$lib/components/school/configuration/DataImportModal.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import { t } from '$lib/i18n';
	import { Upload } from '$lib/icons';
	import { getImportPageState } from '../import-page.svelte';

	const importPage = getImportPageState();
</script>

<ListPageHeader
	eyebrow={$t('import.eyebrow')}
	title={$t('import.title')}
	description={$t('import.description')}
/>

<div class="mb-6 rounded-xl border border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
	{$t('import.recommendedOrder')}
</div>

<article
	class="flex max-w-xl flex-col rounded-xl border border-border bg-card p-5 shadow-sm"
	data-testid="import-pack-generic"
>
	<div class="mb-4 flex items-start gap-3">
		<div class="rounded-lg bg-primary/10 p-2 text-primary">
			<Upload class="size-5" aria-hidden="true" />
		</div>
		<div class="min-w-0 flex-1">
			<h3 class="font-display text-lg font-semibold">{$t('import.card.title')}</h3>
			<p class="mt-1 text-sm text-muted-foreground">{$t('import.card.description')}</p>
		</div>
	</div>

	<dl class="mb-5 space-y-2 text-sm">
		<div>
			<dt class="font-medium text-foreground">{$t('import.formats')}</dt>
		</div>
	</dl>

	<div class="mt-auto">
		<Button onclick={() => (importPage.importModalOpen = true)} data-testid="import-action">
			{$t('import.card.action')}
		</Button>
	</div>
</article>

<DataImportModal bind:open={importPage.importModalOpen} />
