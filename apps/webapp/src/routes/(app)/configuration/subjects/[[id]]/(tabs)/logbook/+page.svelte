<script lang="ts">
	import { page } from '$app/stores';
	import { detailHref } from '$lib/detail-hrefs';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { getSubjectsPageState } from '../../../subjects-page.svelte';
	import { isCatalogConfigSubject, activeSubjectsDetailTab } from '../../../lib/subjects-detail-tabs';
	import SubjectLogbookTab from './components/SubjectLogbookTab.svelte';

	const subjectsPage = getSubjectsPageState();
	const subject = $derived(subjectsPage.selected);

	$effect(() => {
		if (!subject || !isCatalogConfigSubject(subject)) {
			return;
		}
		if (activeSubjectsDetailTab($page.url.pathname, subject.id) === 'progression') {
			return;
		}
		const path = detailHref.configSubjectTab(subject.id, 'progression');
		void appGoto(`${path}${detailNavigationSearch($page.url)}`, { replaceState: true });
	});
</script>

{#if subject && !isCatalogConfigSubject(subject)}
	<SubjectLogbookTab {subject} />
{/if}
