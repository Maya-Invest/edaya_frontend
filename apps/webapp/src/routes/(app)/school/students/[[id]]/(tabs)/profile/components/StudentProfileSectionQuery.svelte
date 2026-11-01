<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { StudentProfileSection } from '../student-profile-tab.svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { getStudentProfileTabState } from '../student-profile-tab.svelte';

	const { section, children: content }: { section: StudentProfileSection; children: Snippet } = $props();
	const owner = getStudentProfileTabState();
	const query = $derived(owner.query(section));
</script>
<PageQuery compactLoading {query} cache={false} cacheKey={url => `${drawerTabRouteCacheKey(url)}:profile:${section}`}>
	{#snippet children(data)}<DataState compact status={owner.statusFor(section, $page.params.id ?? '')?.status ?? data.status} errorMessage={owner.statusFor(section, $page.params.id ?? '')?.errorMessage ?? data.errorMessage} preserveShell>{@render content()}</DataState>{/snippet}
</PageQuery>
