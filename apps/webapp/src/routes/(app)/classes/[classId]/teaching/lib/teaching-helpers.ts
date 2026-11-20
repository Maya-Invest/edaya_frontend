import type { Subject } from '$lib/types/school';

export interface TeachingPageSlice {
	classId: string;
	subjects: Subject[];
}

export function emptyTeachingSlice(classId: string): TeachingPageSlice {
	return {
		classId,
		subjects: [],
	};
}

export function teachingDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/classes\/([^/]+)\/teaching\/([^/]+)/);
	return match?.[2];
}

export function teachingClassIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/classes\/([^/]+)\/teaching/);
	return match?.[1];
}

export function subjectProgress(subject: Subject): number {
	return subject.completedPercentage ?? 0;
}

export function overallClassProgress(subjects: Subject[]): number {
	if (subjects.length === 0) {
		return 0;
	}
	const total = subjects.reduce((sum, subject) => sum + subjectProgress(subject), 0);
	return Math.round(total / subjects.length);
}
