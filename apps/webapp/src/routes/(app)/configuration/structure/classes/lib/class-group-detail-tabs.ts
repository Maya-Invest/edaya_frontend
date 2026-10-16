export const CLASS_GROUP_DETAIL_TABS = [
	{ key: 'profile', segment: 'profile', labelKey: 'classGroups.profileTab' },
	{ key: 'assignments', segment: 'assignments', labelKey: 'classGroups.assignmentsTab' },
] as const;

export type ClassGroupDetailTabKey = (typeof CLASS_GROUP_DETAIL_TABS)[number]['key'];
export type ClassGroupDetailTabSegment = (typeof CLASS_GROUP_DETAIL_TABS)[number]['segment'];

export function activeClassGroupDetailTab(pathname: string, classGroupId: string): ClassGroupDetailTabKey {
	const base = `/configuration/structure/classes/${classGroupId}`;
	if (pathname === base || pathname === `${base}/` || pathname === `${base}/profile`) {
		return 'profile';
	}
	const suffix = pathname.slice(base.length + 1);
	const match = CLASS_GROUP_DETAIL_TABS.find(tab => tab.segment === suffix.split('/')[0]);
	return match?.key ?? 'profile';
}
