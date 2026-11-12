import type { PersonKind } from '$lib/people-profile-fields';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { get } from 'svelte/store';
import { identifierCaller, identifierGroups } from './identifier-groups';

interface Context { kind: PersonKind; entityId: string; identifier: string; onCorrected: (value: string) => void }
export class IdentifierCorrectionState {
 open = $state(false);
 busy = $state(false);
 proposed = $state('');
 expected = $state('');
 private contextKey = '';
 private attempt = '';
 constructor(private context: () => Context) {}
 private key = () => JSON.stringify([authSession.schoolId, identifierCaller(), this.context().kind, this.context().entityId]);
 get normalized() { return this.proposed.normalize('NFKC').trim().replace(/[a-z]/g, letter => letter.toUpperCase()); }
 get valid() { return this.normalized.length <= 20 && (!this.normalized || /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(this.normalized)) && this.normalized !== this.expected && this.contextKey === this.key(); }
 begin = () => {
 this.expected = this.context().identifier;
  this.proposed = this.expected;
  this.contextKey = this.key();
  this.attempt = crypto.randomUUID();
  this.open = true;
};

 submit = async () => {
  if (!this.valid || this.busy)
return;
  this.busy = true;
  const context = this.context();
  const key = this.contextKey;
  try {
   const result = await runMutation(() => getBrowserSchoolClient().commands.correctHumanIdentifier({ group: identifierGroups[context.kind], entityId: context.entityId, expectedIdentifier: this.expected || null, identifier: this.normalized || null, requestId: this.attempt }), { successMessage: get(t)('identifier.corrected'), versionKeys: ['students', 'teachers', 'guardians', 'staff'] });
   if (result && key === this.key()) {
 context.onCorrected(result.identifier ?? '');
  this.open = false;
}
  }
 finally { this.busy = false; }
 };
}
