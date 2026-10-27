<script lang="ts">
  import type { Guardian } from '../../../src/lib/types/school';
  import { setLang } from '../../../src/lib/i18n';
  import ConfirmModal from '../../../src/lib/components/ui/ConfirmModal.svelte';
  import { provideDirtyWork } from '../../../src/lib/interaction/dirty-work.svelte';
  import GuardianEditModal from '../../../src/routes/(app)/school/guardians/[[id]]/components/GuardianEditModal.svelte';
  import GuardianNotificationSettingsView from '../../../src/lib/smart-components/account-notifications/components/GuardianNotificationSettingsView.svelte';
  import { controls, switchAccountAndRelease } from './environment.svelte';
  const dirtyWork = provideDirtyWork();
  const settingsMode = new URL(location.href).searchParams.has('settings');
  setLang(new URL(location.href).searchParams.has('fr') ? 'fr' : 'en');
  const guardian: Guardian = { id: 'guardian', name: 'Ada Parent', firstName: 'Ada', lastName: 'Parent', initials: 'AP', phone: '+22501020304', alternativePhone: '+22505060708', email: 'saved@example.test', emailNotificationsEnabled: false, smsNotificationsEnabled: false, pushNotificationsEnabled: false, hasAccess: true, subjectId: 'subject', relation: 'parent', studentIds: [], preferredContact: 'phone' };
  const data = { settings: { ...guardian, subjectId: 'subject', hasAccess: true, links: [{ studentId: 'child', receivesAcademicReports: true, receivesAttendanceAlerts: true }] }, studentNames: { child: 'Ada Child' }, loginEmail: 'different-login@example.test' };
  let open = $state(false);
</script>
<main class="mx-auto max-w-3xl p-4">
  <button onclick={switchAccountAndRelease}>Change account</button>
  {#if settingsMode}
    <GuardianNotificationSettingsView data={data as never} onSaved={() => controls.saved++} />
  {:else}
    <button onclick={() => open = true}>Edit guardian</button>
    <GuardianEditModal {guardian} bind:open showTrigger={false} />
  {/if}
  <ConfirmModal open={dirtyWork.pending !== null} title="Discard changes?" description="Your changes have not been saved." confirmLabel="Discard changes" cancelLabel="Keep editing" onOpenChange={value => { if (!value) dirtyWork.cancel(); }} onConfirm={() => dirtyWork.discard()} onCancel={() => dirtyWork.cancel()} />
  <output data-testid="requests" class="sr-only">{JSON.stringify(controls.requests)}</output>
  <output data-testid="dirty" class="sr-only">{JSON.stringify({ dirty: dirtyWork.hasDirtyWork(), pending: !!dirtyWork.pending })}</output>
  <output data-testid="pending" class="sr-only">{String(controls.pending)}</output>
  <output data-testid="saved" class="sr-only">{controls.saved}</output>
</main>
