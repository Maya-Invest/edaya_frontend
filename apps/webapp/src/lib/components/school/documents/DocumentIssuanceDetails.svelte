<script lang="ts">
	import type { DocumentIssuance } from '$lib/api/documents-types';
	import { t } from '$lib/i18n';

	const { issuance }: {
		issuance: DocumentIssuance;
	} = $props();
</script>
<details class="mt-3 space-y-2 rounded-collection border border-border p-3 text-xs">
	<summary class="cursor-pointer font-medium">{$t('profile.additionalFields')}</summary>
	<dl class="grid gap-2 sm:grid-cols-2">
		<div><dt class="text-muted-foreground">{$t('profile.createdAt')}</dt><dd>{issuance.createdAt}</dd></div>
		<div><dt class="text-muted-foreground">{$t('profile.documentLanguage')}</dt><dd>{issuance.locale === 'fr' ? 'Français' : 'English'}</dd></div>
		<div><dt class="text-muted-foreground">{$t('profile.templateVersion')}</dt><dd>{issuance.templateVersion ?? '—'}</dd></div>
		<div><dt class="text-muted-foreground">{$t('profile.familyDownload')}</dt><dd>{$t(issuance.familyDownload ? 'common.yes' : 'common.no')}</dd></div>
		{#if issuance.replacesIssuanceId}<div><dt class="text-muted-foreground">{$t('profile.replacesDocument')}</dt><dd>{issuance.replacesIssuanceId}</dd></div>{/if}
		{#if issuance.replacedByIssuanceId}<div><dt class="text-muted-foreground">{$t('profile.replacedByDocument')}</dt><dd>{issuance.replacedByIssuanceId}</dd></div>{/if}
		{#if issuance.voidedAt}<div><dt class="text-muted-foreground">{$t('profile.voidedAt')}</dt><dd>{issuance.voidedAt}</dd></div>{/if}
		{#if issuance.voidReason}<div><dt class="text-muted-foreground">{$t('documents.voidReason')}</dt><dd class="whitespace-pre-wrap">{issuance.voidReason}</dd></div>{/if}
	</dl>
</details>
