import assert from 'node:assert/strict';
import { resolveApiUrl } from '../support/integration-hosts';
import { acceptInvitationToken, ensureSecondaryAuthAccount } from '../support/api-provision';
import { apiFetch, resolveSchoolId } from './journey-api';
import type { UiJourney } from './journey-context';

/** Create a real parent thread so required messaging deep links never depend on an empty list. */
export async function createConversationFixture(journey: UiJourney): Promise<void> {
	const { page, base } = journey.ctx;
	const guardianId = journey.entities.guardianId;
	assert(guardianId, 'Messaging fixture requires the journey guardian');
	const email = `message-parent-${crypto.randomUUID()}@integration.edaya.test`;
	const invitation = await apiFetch(page, base, '/core/commands/send-account-invitation', {
		method: 'POST', data: { kind: 'guardian', targetId: guardianId, contactChannel: 'email', contactValue: email },
	});
	assert(invitation.ok(), `Guardian fixture invitation HTTP ${invitation.status()}`);
	const { token } = await invitation.json() as { token: string };
	assert(token, 'Messaging fixture invitation missing');
	const account = await ensureSecondaryAuthAccount(resolveApiUrl(), base, email, '', 'Integration Parent');
	assert('client' in account, 'Messaging fixture account could not sign in');
	assert(await acceptInvitationToken(account.client, token), 'Messaging fixture invitation could not be accepted');
	const schoolId = await resolveSchoolId(page, base);
	assert(schoolId, 'Messaging fixture requires a school');
	const response = await account.client.jsonRequest<{ id: string }>('/core/commands/start-conversation', {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-school-id': schoolId, 'x-actor-kind': 'guardian', 'x-actor-id': guardianId },
		body: JSON.stringify({ requestId: crypto.randomUUID(), destination: 'school', subject: 'Integration parent conversation', body: 'A disposable parent question for messaging qualification.', studentId: journey.entities.studentId }),
	});
	assert(response.response.ok && response.body?.id, `Messaging fixture creation HTTP ${response.response.status}`);
	journey.entities.conversationId = response.body.id;
}
