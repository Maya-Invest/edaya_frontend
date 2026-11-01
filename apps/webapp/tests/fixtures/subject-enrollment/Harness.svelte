<script lang="ts">
  import { page } from '$app/stores';
  import { setLang } from '../../../src/lib/i18n';
  import ConfirmModal from '../../../src/lib/components/ui/ConfirmModal.svelte';
  import { provideDirtyWork } from '../../../src/lib/interaction/dirty-work.svelte';
  import SubjectParticipation from '../../../src/routes/(app)/school/students/[[id]]/(tabs)/enrollments/SubjectParticipation.svelte';
  import StudentsList from '../../../src/routes/(app)/school/students/components/StudentsList.svelte';
  import ClassStudentsList from '../../../src/routes/(app)/classes/[classId]/students/components/ClassStudentsList.svelte';
  import { controls, switchYear } from './environment.svelte';
  const dirtyWork = provideDirtyWork();
  setLang('en');
</script>
<main class="mx-auto max-w-6xl space-y-5 p-6">
  <button data-testid="fail" onclick={() => controls.fail = true}>Fail next save</button>
  <button data-testid="conflict" onclick={() => controls.conflict = true}>Conflict next save</button>
  <button data-testid="fr" onclick={() => setLang('fr')}>FR</button>
  <button data-testid="year" onclick={switchYear}>Change year</button>
  {#if $page.url.pathname === '/school/students'}
    <StudentsList onCreate={() => {}} />
  {:else if $page.url.pathname.startsWith('/classes/')}
    <ClassStudentsList classId="class" />
  {:else}
    <SubjectParticipation studentId="child" studentName="Ada Student" />
  {/if}
  <ConfirmModal open={dirtyWork.pending !== null} title="Discard changes?" description="Your changes have not been saved." confirmLabel="Discard changes" cancelLabel="Keep editing" onOpenChange={open => { if (!open) dirtyWork.cancel(); }} onConfirm={() => dirtyWork.discard()} onCancel={() => dirtyWork.cancel()} />
  <output data-testid="requests" class="sr-only">{JSON.stringify(controls.requests)}</output>
</main>
