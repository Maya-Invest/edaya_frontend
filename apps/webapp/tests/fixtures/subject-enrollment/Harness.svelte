<script lang="ts">
  import { setLang } from '../../../src/lib/i18n';
  import SubjectParticipation from '../../../src/routes/(app)/school/students/[[id]]/(tabs)/enrollments/SubjectParticipation.svelte';
  import { controls } from './environment.svelte';
  setLang('en');
</script>
<main class="mx-auto max-w-xl space-y-5 p-6">
  <button data-testid="fail" onclick={() => controls.fail = true}>Fail next save</button>
  <button data-testid="fr" onclick={() => setLang('fr')}>FR</button>
  <SubjectParticipation studentId="child" />
  <output data-testid="requests" class="sr-only">{JSON.stringify(controls.requests)}</output>
</main>
