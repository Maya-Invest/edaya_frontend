<script lang="ts">
	import { page } from '$app/stores';
	import { financeReadKey } from '$lib/api/finance-workspace';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import DrawerFrame from '$lib/components/ui/DrawerFrame.svelte';
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
<DrawerFrame label={$t('billing.fee')} onClose={close} testId="fee-drawer">
	<div class="flex min-h-0 flex-1 flex-col">
		<header class="flex items-center justify-between border-b border-border px-6 py-4">
			<h2>{$t('billing.fee')}</h2>
			<Button size="icon" variant="ghost" aria-label={$t('common.close')} onclick={close} class="rounded-full p-2 hover:bg-secondary"><X class="size-4" /></Button>
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
</DrawerFrame>
