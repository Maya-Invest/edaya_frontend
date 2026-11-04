<script lang="ts">
  import { dev } from '$app/environment';
  import SelectField from '$lib/components/ui/SelectField.svelte';
  import { onMount } from 'svelte';
  import type { components } from '$lib/api/schema';
  import { getBrowserSchoolClient } from '$lib/api/school-client';
  import FormModal from '$lib/components/ui/FormModal.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { createBrowserTransport } from '$lib/api/browser-transport';
  import { academicContext } from '$lib/academic/context.svelte';
  import { ApiError } from '$lib/api/http';
  import { authRequest } from '$lib/auth/client';
  import { isLocalDevApi } from '$lib/env/app-env';
  import { t } from '$lib/i18n';

  const { teacherId }: { teacherId: string } = $props();
  type Options = components['schemas']['TeacherQuickCodeOptions'];
  type Expiry = components['schemas']['TeacherQuickCodeIssue']['expiry'];
  const devTransport = createBrowserTransport(() => academicContext.yearId || undefined);
  let options = $state<Options>();
  let identifierId = $state('');
  let expiry = $state<Expiry>('week');
  let open = $state(false);
  let busy = $state(false);
  let hidden = $state(false);
  let notice = $state('');
  let canReveal = $state(false);
  let code = $state('');
  let generation = 0;
  let request: { id: string; selection: string } | undefined;
  let timeout: ReturnType<typeof setTimeout>;
  const labels = { week: 'quick.week', month: 'quick.month', period: 'quick.period', year: 'quick.year', none: 'quick.none' } as const;
  function clear() {
    generation++;
    clearTimeout(timeout);
    code = '';
  }
  async function load() {
    options = await getBrowserSchoolClient().authorization.teacherQuickCodeOptions({ teacherId });
    if (!options.contacts.some(i => i.id === identifierId)) identifierId = options.contacts[0]?.id ?? '';
  }
  onMount(() => {
    void load().catch(error => {
      if (error instanceof ApiError && error.status === 404) hidden = true;
      else notice = 'quick.unavailable';
    });
    if (dev && isLocalDevApi()) void authRequest<{ teacherQuickCodeReveal?: boolean }>('testing/capabilities', {}, 'GET')
      .then(({ data }) => canReveal = !!data?.teacherQuickCodeReveal).catch(() => {});
    document.addEventListener('visibilitychange', clear);
    return () => { clear(); document.removeEventListener('visibilitychange', clear); };
  });
  async function issue() {
    if (busy) return;
    clear();
    busy = true;
    const selection = identifierId + '/' + expiry;
    if (request?.selection !== selection) request = { id: crypto.randomUUID(), selection };
    try {
      const result = await getBrowserSchoolClient().authorization.issueTeacherQuickCode({ teacherId }, { identifierId, expiry, requestId: request.id });
      notice = result.status === 'active' ? 'quick.sent' : result.status === 'failed' ? 'quick.failed' : 'quick.unconfirmed';
      open = false;
      request = undefined;
      await load();
    } catch { notice = 'quick.unavailable'; }
    finally { busy = false; }
  }
  async function reveal() {
    if (!dev || !canReveal || !isLocalDevApi()) return;
    clear();
    const current = generation;
    try {
      const result = await devTransport.request<{ code: string }>('POST', '/core/dev/teachers/' + encodeURIComponent(teacherId) + '/quick-login-code/reveal', { body: {} });
      if (current !== generation || document.hidden) return;
      code = result.code;
      // Limit the display time even for codes without expiry.
      timeout = setTimeout(clear, Math.max(0, Math.min(60000, (options?.active?.expiry ?? Infinity) - Date.now())));
    } catch { if (current === generation) notice = 'quick.refreshNeeded'; }
  }
</script>

{#if !hidden}
<section class="space-y-3 rounded-collection border border-border bg-card p-4">
  <h3 class="font-semibold">{$t('quick.title')}</h3>
  {#if options}
    {#if options.active}
      <p>{options.active.channel} · {options.active.hint} · {options.active.expiry ? new Date(options.active.expiry).toLocaleString() : $t('quick.none')}</p>
    {/if}
    {#if options.contacts.length}
      <Button disabled={busy} onclick={() => { expiry = 'week'; open = true; clear(); }}>{$t(options.active ? 'quick.refresh' : 'quick.generate')}</Button>
      <FormModal bind:open title={$t(options.active ? 'quick.refresh' : 'quick.generate')} submitLabel={$t(options.active ? 'quick.refresh' : 'quick.generate')} {busy} submitDisabled={!identifierId || !(expiry in options.expiries)} onSubmit={issue}>
      <label class="block">{$t('quick.destination')}
        <SelectField aria-label={$t('quick.destination')} bind:value={identifierId} disabled={busy} class="block rounded-md border p-2">
          {#each options.contacts as contact}<option value={contact.id}>{contact.channel} · {contact.hint}</option>{/each}
        </SelectField>
      </label>
      <label class="block">{$t('quick.expiry')}
        <SelectField aria-label={$t('quick.expiry')} bind:value={expiry} disabled={busy} class="block rounded-md border p-2">
          {#each Object.entries(labels) as [value, label]}<option {value} disabled={!(value in options.expiries)}>{$t(label)}</option>{/each}
        </SelectField>
      </label>
      {#if options.expiries[expiry]}<p>{new Date(options.expiries[expiry]!).toLocaleString()}</p>{/if}
      </FormModal>
    {:else}<p>{$t('quick.noContact')}</p>{/if}
    {#if dev && canReveal && options.active}
      <Button variant="outline" disabled={busy} onclick={reveal}>{$t('quick.reveal')}</Button>
      {#if code}<output class="font-mono">{code}</output>{/if}
    {/if}
  {/if}
  {#if notice}<p role="status">{$t(notice)}</p>{/if}
</section>
{/if}
