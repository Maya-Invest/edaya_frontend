<script lang="ts">
 import GradeScalesList from '../../../src/routes/(app)/configuration/grade-scales/components/GradeScalesList.svelte';
 import SchoolSettingsView from '../../../src/routes/(app)/configuration/school/components/SchoolSettingsView.svelte';
 import ReportCardDefinitionDetail from '../../../src/routes/(app)/configuration/report-cards/[[id]]/components/ReportCardDefinitionDetail.svelte';
 import GradingConfigurationModal from '../../../src/routes/(app)/configuration/grade-levels/components/GradingConfigurationModal.svelte';
 import { setLang } from '../../../src/lib/i18n';
 import { evidence, level, definition } from './action-state.svelte';
 import { page, appGoto } from './navigation';
 import { access } from './permissions.svelte';
 let gradingOpen = $state(false);
 let confirm = $state(false);
</script>
<nav class="flex flex-wrap gap-3 p-4">
 <button data-testid="scales" onclick={() => appGoto('/configuration/grade-scales')}>Scales</button>
 <button data-testid="school" onclick={() => appGoto('/configuration/school')}>School</button>
 <button data-testid="model" onclick={() => appGoto('/configuration/report-cards/model')}>Model</button>
 <button data-testid="policy" onclick={() => gradingOpen = true}>Policy</button>
 <button data-testid="fr" onclick={() => setLang('fr')}>French</button>
 <button data-testid="en" onclick={() => setLang('en')}>English</button>
 <button data-testid="permissions" onclick={() => access.allowed = !access.allowed}>Permissions</button>
 <button data-testid="failure" onclick={() => evidence.succeed = !evidence.succeed}>Failure</button>
</nav>
<pre data-testid="requests" class="sr-only">{JSON.stringify(evidence.requests)}</pre>
<main class="mx-auto max-w-6xl p-4">
 {#if $page.url.pathname.includes('/school')}<SchoolSettingsView />
 {:else if $page.url.pathname.includes('/report-cards/')}<ReportCardDefinitionDetail {definition} />
 {:else}<GradeScalesList />{/if}
</main>
<GradingConfigurationModal bind:open={gradingOpen} gradeLevel={level} {confirm} onConfirmStep={value => confirm = value} />
