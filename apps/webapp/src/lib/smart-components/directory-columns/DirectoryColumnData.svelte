<script lang="ts">
	import type { PageQueryRequest } from '$lib/queries/page-status';
	import type { DirectoryColumnsState } from './directory-columns-state.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';

	const { owner, rows }: {
		owner: DirectoryColumnsState;
		rows: readonly {
			id: string;
			classId?: string;
		}[];
	} = $props();
	const query = (url: URL, request: PageQueryRequest | undefined = undefined) => owner.query(rows, url, request);
</script>
<PageQuery cache={false} {query} cacheKey={() => owner.identity(rows)} loadingTitle={$t('profile.additionalFields')}>
	{#snippet children(data)}{#if data.status === 'error'}<p role="alert" class="mb-3 text-sm text-destructive">{data.errorMessage}</p>{/if}{/snippet}
</PageQuery>
