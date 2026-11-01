import { registerAndLinkGuardian } from '$lib/guardians/register-and-link-guardian';
import { expect, test } from 'bun:test';

test('guardian registration and student linking send an empty first name without inventing components', async () => {
	const calls: Array<{ kind: string; payload: unknown }> = [];
	const client = { commands: {
		registerGuardian: async (payload: unknown) => { calls.push({ kind: 'register', payload }); },
		linkGuardianToStudent: async (payload: unknown) => { calls.push({ kind: 'link', payload }); },
	} } as unknown as Parameters<typeof registerAndLinkGuardian>[0];
	await registerAndLinkGuardian(client, { guardianId: 'guardian', schoolId: 'school', firstName: ' ', lastName: ' Koné ', linkId: 'link', studentId: 'student', phone: '+2250012345678' });
	expect(calls.map(call => call.kind)).toEqual(['register', 'link']);
	expect(calls[0]!.payload).toMatchObject({ firstName: '', lastName: 'Koné', phone: '+2250012345678', sendAccountInvitation: false });
	expect(calls[1]!.payload).toMatchObject({ guardianId: 'guardian', studentId: 'student' });
});
