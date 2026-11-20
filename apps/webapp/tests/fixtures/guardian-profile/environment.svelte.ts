import { writable } from 'svelte/store';
import { saveGuardianNotificationPreferencesMutation } from '../../../src/lib/api/mutations/notifications.mutations';
export const page = writable({ url: new URL(location.href), state: {}, params: {} });
export const authSession = $state({ authUserId: 'login', schoolId: 'school', subjectId: 'subject', userId: 'guardian', guardianSettings: null });
export const controls = $state({ requests: [] as Record<string, unknown>[], fail: new URL(location.href).searchParams.has('fail'), saved: 0, pending: false, hold: new URL(location.href).searchParams.has('hold') });
let releaseRequest: (() => void) | undefined;
export function switchAccountAndRelease() { authSession.userId = 'another-guardian'; authSession.schoolId = 'another-school'; releaseRequest?.(); }
export const beforeNavigate = () => {};
export const afterNavigate = () => {};
export const goto = async () => {};
export const appGoto = goto;
export const appPath = (path: string) => path;
export const appHref = appPath;
export const academicContext = { schoolScopeId: 'school', yearId: 'year', years: [], schools: [], hierarchy: [], periods: [] };
export const hasPermission = () => true;
export const hasAnyPermission = () => true;
async function update(input: Record<string, unknown>) {
  controls.requests.push(JSON.parse(JSON.stringify(input)));
  if (controls.hold) { controls.pending = true; await new Promise<void>(resolve => { releaseRequest = resolve; }); controls.pending = false; }
  if (controls.fail) { controls.fail = false; throw new Error('Retry'); }
  return {};
}
export const getBrowserSchoolClient = () => ({ commands: { updateGuardianProfile: update } });
export const runMutation = async (request: () => Promise<unknown>) => { try { return await request(); } catch { return null; } };
export const getNotificationSettingsPageState = () => ({ performSaveGuardianNotificationPreferences: saveGuardianNotificationPreferencesMutation });
export const getGuardiansPageState = () => ({ updateContact: async (input: Record<string, unknown>) => { try { await update(input); return true; } catch { return false; } } });
