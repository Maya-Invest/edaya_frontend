export const STAFF_DETAIL_TABS = [
	{ key: 'profile', segment: 'profile', labelKey: 'drawer.tab.profile' },
	{ key: 'permissions', segment: 'permissions', labelKey: 'drawer.tab.permissions' },
] as const;

export type StaffDetailTabKey = (typeof STAFF_DETAIL_TABS)[number]['key'];
export type StaffDetailTabSegment = (typeof STAFF_DETAIL_TABS)[number]['segment'];

export function activeStaffDetailTab(pathname: string, staffId: string): StaffDetailTabKey {
	const base = `/school/staff/${staffId}`;
	if (pathname === base || pathname === `${base}/` || pathname === `${base}/profile`) {
		return 'profile';
	}
	const suffix = pathname.slice(base.length + 1);
	const match = STAFF_DETAIL_TABS.find(tab => tab.segment === suffix.split('/')[0]);
	return match?.key ?? 'profile';
}
