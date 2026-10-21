<script lang="ts">
	import { page } from '$app/stores';
	import { financeReadKey } from '$lib/api/finance-workspace';
	import DataState from '$lib/components/ui/DataState.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { X } from '$lib/icons';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import FeeDetail from '../components/FeeDetail.svelte';
	import { getFeesPageState } from '../fees-page.svelte';

	const state = getFeesPageState();
	const query = state.queryDetail(() => $page.params.feeId ?? '');
	function close() {
		closeDetailDrawer(listSurfaceHref('/finance/fees', $page.url));
	}
</script>
<Dialog.Root open onOpenChange={(open) => {
	if (!open)
		close();
}}>
	<Dialog.Content class="left-auto right-0 top-0 h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none border-l p-0 md:w-1/2">
		<div class="flex min-h-0 flex-col">
			<header class="flex items-center justify-between border-b border-border px-6 py-4">
				<Dialog.Title>{$t('billing.fee')}</Dialog.Title>
				<button type="button" aria-label={$t('common.close')} onclick={close} class="rounded-full p-2 hover:bg-secondary"><X class="size-4" /></button>
			</header>
			<div class="min-h-0 flex-1 overflow-y-auto p-6">
				<PageQuery {query} cache={false} cacheKey={() => financeReadKey(`fee:${$page.params.feeId}`)}>
					{#snippet children(data)}
						<DataState status={data.status} errorMessage={data.errorMessage}>
							{#if data.fee}<FeeDetail fee={data.fee} />{/if}
						</DataState>
					{/snippet}
				</PageQuery>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
