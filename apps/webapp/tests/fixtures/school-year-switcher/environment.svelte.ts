export const base = '';
import { writable } from 'svelte/store';
export const page = writable({ url: new URL(location.href), params: {}, state: {} });
type Membership = { kind: 'staff'; actorId: string; schoolId: string; schoolName: string; schoolShortName: string };
export const authSession = $state({ authUserId: 'login', schoolId: 'school', sessionKind: 'staff', userId: 'staff', subjectId: 'login', grants: null, staffMemberships: [] as Membership[], school: { shortName: 'Oak School' }, activeStaffMembership: null as Membership | null });
export const appPath = (path: string) => path.replace('/(app)', '');
export const classItemHref = (classId: string, segment: string) => `/classes/${classId}/${segment}`;
export const appGoto = async () => {};
export const previewSchoolYears = (member: Membership) => (window as any).yearFixture.preview(member);
export const switchActiveSchool = async (schoolId: string, yearId: string) => { (window as any).yearFixture.school(schoolId, yearId); };
export const getMessageCount = () => undefined;

export const loadPrivateImage = async (source: string) => ({ url: source, dispose() {} });
