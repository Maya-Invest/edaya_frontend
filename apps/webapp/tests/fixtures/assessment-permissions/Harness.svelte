<script lang="ts">
	import { formatPermissionGroupLabel } from '$lib/api/staff-permission-profiles-data';
	import { setLang, t } from '$lib/i18n';
	import EvaluationDetailHeader from '../../../src/routes/(app)/classes/[classId]/evaluations/[[id]]/components/EvaluationDetailHeader.svelte';
	import EvaluationDetailTabBar from '../../../src/routes/(app)/classes/[classId]/evaluations/[[id]]/components/EvaluationDetailTabBar.svelte';
	import EvaluationsList from '../../../src/routes/(app)/classes/[classId]/evaluations/components/EvaluationsList.svelte';
	import { state, setMode } from './environment.svelte';
	import { page, appGoto } from './navigation';
</script>
<nav class="flex gap-4 p-4">
	<button data-testid="setup" onclick={() => setMode('setup')}>Setup</button><button data-testid="marker" onclick={() => setMode('marker')}>Marker</button><button data-testid="other" onclick={() => setMode('other')}>Other subject</button>
	<button data-testid="list" onclick={() => appGoto('/classes/class-a/evaluations')}>List</button><button data-testid="edit" onclick={() => appGoto('/classes/class-a/evaluations/assessment-a/details?modal=edit')}>Direct edit</button>
	<button data-testid="delete" onclick={() => appGoto('/classes/class-a/evaluations/assessment-a/details?modal=delete')}>Direct delete</button>
	<button data-testid="fr" onclick={() => setLang('fr')}>French</button><button data-testid="en" onclick={() => setLang('en')}>English</button>
</nav>
<p data-testid="group">{formatPermissionGroupLabel('ASSESSMENT', $t)}</p>
<main class="mx-auto max-w-6xl p-4">
	{#if $page.params.id}
		<EvaluationDetailHeader classId="class-a" evaluation={state.evaluation} />
		<EvaluationDetailTabBar classId="class-a" evaluation={state.evaluation} />
	{:else}<EvaluationsList classId="class-a" />{/if}
</main>
<pre data-testid="requests">{JSON.stringify(state.requests)}</pre>
