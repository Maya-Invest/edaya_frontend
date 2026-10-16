<script lang="ts">
 import ReportCardDefinitionsList from '../../../src/routes/(app)/configuration/structure/details/report-cards/components/ReportCardDefinitionsList.svelte';
 import { academicContext } from './academic-context.svelte';
 import GradeScalesList from '../../../src/routes/(app)/configuration/grade-scales/components/GradeScalesList.svelte';
 import SchoolSettingsView from '../../../src/routes/(app)/configuration/school/components/SchoolSettingsView.svelte';
 import ReportCardDefinitionDetail from '../../../src/routes/(app)/configuration/structure/details/report-cards/[[id]]/components/ReportCardDefinitionDetail.svelte';
 import GradeLevelFormModal from '../../../src/routes/(app)/configuration/structure/levels/components/GradeLevelFormModal.svelte';
 import { setLang } from '../../../src/lib/i18n';
 import { evidence, level, definition } from './action-state.svelte';
 import { page, appGoto } from './navigation';
 import { access } from './permissions.svelte';
 let templateLevel = $state('level');
 let gradingOpen = $state(false);
 let createLevel = $state(false);
 let confirm = $state(false);
</script>
<nav class="flex flex-wrap gap-3 p-4">
 <button data-testid="templates" onclick={() => { templateLevel = 'level'; academicContext.yearId = 'year'; appGoto('/configuration/structure/details?gradeLevel=level'); }}>Templates</button>
 <button data-testid="other-template-level" onclick={() => { templateLevel = 'other'; appGoto('/configuration/structure/details?gradeLevel=other'); }}>Other level</button>
 <button data-testid="empty-template-year" onclick={() => { academicContext.yearId = 'empty'; appGoto('/configuration/structure/details?gradeLevel=level'); }}>Empty year</button>
 <button data-testid="scales" onclick={() => appGoto('/configuration/grade-scales')}>Scales</button>
 <button data-testid="school" onclick={() => appGoto('/configuration/school')}>School</button>
 <button data-testid="model" onclick={() => appGoto('/configuration/structure/details/report-cards/model')}>Model</button>
 <button data-testid="policy" onclick={() => { createLevel = false; gradingOpen = true; }}>Policy</button>
 <button data-testid="create-level" onclick={() => { createLevel = true; gradingOpen = true; }}>Add level</button>
 <button data-testid="grading-failure" onclick={() => evidence.failGrading = !evidence.failGrading}>Grading failure</button>
 <button data-testid="fr" onclick={() => setLang('fr')}>French</button>
 <button data-testid="en" onclick={() => setLang('en')}>English</button>
 <button data-testid="permissions" onclick={() => access.allowed = !access.allowed}>Permissions</button>
 <button data-testid="failure" onclick={() => evidence.succeed = !evidence.succeed}>Failure</button>
</nav>
<pre data-testid="requests" class="sr-only">{JSON.stringify(evidence.requests)}</pre>
<main class="mx-auto max-w-6xl p-4">
 {#if $page.url.pathname === '/configuration/structure/details'}<ReportCardDefinitionsList gradeLevelId={templateLevel} onSelect={row => appGoto(`/configuration/structure/details/report-cards/${row.id}?gradeLevel=${row.gradeLevelId}`)} />
 {:else if $page.url.pathname.includes('/school')}<SchoolSettingsView />
 {:else if $page.url.pathname.includes('/report-cards/')}<ReportCardDefinitionDetail {definition} />
 {:else}<GradeScalesList />{/if}
</main>
<GradeLevelFormModal bind:open={gradingOpen} gradeLevel={createLevel ? undefined : evidence.savedLevel ?? level} {confirm} onConfirmStep={value => confirm = value} />
