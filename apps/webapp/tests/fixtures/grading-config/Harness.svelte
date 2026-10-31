<script lang="ts">
 import SubjectsList from '../../../src/routes/(app)/configuration/structure/subjects/components/SubjectsList.svelte';
 import GradeScalesList from '../../../src/routes/(app)/configuration/grade-scales/components/GradeScalesList.svelte';
 import SchoolSettingsView from '../../../src/routes/(app)/configuration/school/components/SchoolSettingsView.svelte';
 import LevelFormHarness from './LevelFormHarness.svelte';
 import { setLang } from '../../../src/lib/i18n';
 import { evidence } from './action-state.svelte';
 import { page, appGoto } from './navigation';
 import { access } from './permissions.svelte';
 let gradingOpen = $state(false);
 let createLevel = $state(false);
 let confirm = $state(false);
</script>
<nav class="flex flex-wrap gap-3 p-4">
 <button data-testid="modules" onclick={() => { appGoto('/configuration/structure/subjects?gradeLevel=level'); }}>Modules</button>
 <button data-testid="scales" onclick={() => appGoto('/configuration/grade-scales')}>Scales</button>
 <button data-testid="school" onclick={() => appGoto('/configuration/school')}>School</button>
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
 {#if $page.url.pathname.includes('/subjects')}<SubjectsList />
 {:else if $page.url.pathname.includes('/school')}<SchoolSettingsView />
 {:else}<GradeScalesList />{/if}
</main>
<LevelFormHarness bind:open={gradingOpen} create={createLevel} {confirm} onConfirmStep={value => confirm = value} />
