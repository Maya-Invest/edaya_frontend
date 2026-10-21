<script lang="ts">
	import { authSession } from '$lib/auth/session.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { ReferenceCatalogState } from './reference-catalog-state.svelte';

	let { value = $bindable(''), active = true }: {
		value?: string;
		active?: boolean;
	} = $props();
	const catalogue = new ReferenceCatalogState('academicDisciplines');
</script>
{#if active}<PageQuery cache={false} query={catalogue.query} cacheKey={() => `discipline-options:${authSession.schoolId}`} loadingTitle={$t('profile.academicDisciplines')}>
	{#snippet children(data)}<DataState status={data.status} errorMessage={data.errorMessage} preserveShell><select class="h-10 w-full rounded-xl border border-border bg-card px-3" aria-label={$t('profile.discipline')} bind:value><option value="">{$t('profile.notConfigured')}</option>{#each catalogue.rows.filter(row => row.isActive || row.id === value) as option (option.id)}<option value={option.id}>{option.code} · {option.label}</option>{/each}</select>{#if !catalogue.rows.length}<a href="/configuration/other/academic-disciplines" class="text-sm text-primary">{$t('profile.configureDisciplines')}</a>{/if}</DataState>{/snippet}
</PageQuery>{/if}
