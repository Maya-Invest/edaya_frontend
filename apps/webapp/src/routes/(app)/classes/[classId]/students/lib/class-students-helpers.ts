import type { StudentDetailTabKey } from '../../../../school/students/lib/student-detail-tabs';
import { STUDENT_DETAIL_TABS } from '../../../../school/students/lib/student-detail-tabs';

export function classStudentsClassIdFromUrl(url: URL): string | undefined {
	return url.pathname.match(/\/classes\/([^/]+)\/students/)?.[1];
}

export function classStudentDetailIdFromUrl(url: URL): string | undefined {
	return url.pathname.match(/\/classes\/[^/]+\/students\/([^/]+)/)?.[1];
}

export function activeClassStudentDetailTab(
	pathname: string,
	classId: string,
	studentId: string,
): StudentDetailTabKey {
	const base = `/classes/${classId}/students/${studentId}`;
	if (pathname === base || pathname === `${base}/` || pathname === `${base}/profile`) {
		return 'profile';
	}
	const suffix = pathname.slice(base.length + 1);
	const match = STUDENT_DETAIL_TABS.find(tab => tab.segment && tab.segment === suffix.split('/')[0]);
	return match?.key ?? 'profile';
}
