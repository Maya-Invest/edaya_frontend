import { authSession } from '$lib/auth/session.svelte';

export const identifierCaller = () => `${authSession.authUserId}:${authSession.userId}`;
export const identifierGroups = { student: 'students', teacher: 'teachers', guardian: 'guardians', staff: 'staff' } as const;
