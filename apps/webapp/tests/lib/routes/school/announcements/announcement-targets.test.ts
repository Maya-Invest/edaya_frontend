import type { Announcement, AnnouncementTarget } from '$lib/types/school';
import { describe, expect, it } from 'bun:test';
import {
	announcementTargetNeedsEntity,
	resolveAnnouncementTargetLabel,
} from '../../../../../src/routes/(app)/school/announcements/lib/announcement-target-label';
import { announcementDetailIdFromUrl } from '../../../../../src/routes/(app)/school/announcements/lib/announcement-selectors';

function target(overrides: Partial<AnnouncementTarget> = {}): AnnouncementTarget {
	return {
		id: 'tgt-1',
		announcementId: 'ann-1',
		targetKind: 'school',
		...overrides,
	};
}

function announcement(overrides: Partial<Announcement> = {}): Announcement {
	return {
		id: 'ann-1',
		title: 'Notice',
		content: 'Hello',
		status: 'draft',
		priority: 'normal',
		createdAt: '2026-05-01T00:00:00.000Z',
		targets: [target()],
		...overrides,
	};
}

function removeAnnouncementTarget(
	announcements: Announcement[],
	announcementId: string,
	targetId: string,
): Announcement[] {
	return announcements.map((entry) => {
		if (entry.id !== announcementId) {
			return entry;
		}
		return {
			...entry,
			targets: entry.targets.filter(item => item.id !== targetId),
		};
	});
}

describe('announcement target page actions', () => {
	it('removes a recipient from the targeted announcement only', () => {
		const announcements = [
			announcement({
				id: 'ann-1',
				targets: [target({ id: 'tgt-a' }), target({ id: 'tgt-b' })],
			}),
			announcement({
				id: 'ann-2',
				targets: [target({ id: 'tgt-c', announcementId: 'ann-2' })],
			}),
		];

		const next = removeAnnouncementTarget(announcements, 'ann-1', 'tgt-a');

		expect(next[0]?.targets.map(item => item.id)).toEqual(['tgt-b']);
		expect(next[1]?.targets.map(item => item.id)).toEqual(['tgt-c']);
	});

	it('allows removing the last recipient on a draft', () => {
		const next = removeAnnouncementTarget([announcement()], 'ann-1', 'tgt-1');
		expect(next[0]?.targets).toEqual([]);
	});
});

describe('announcement target labels', () => {
	it('does not require an entity for school-wide kinds', () => {
		expect(announcementTargetNeedsEntity('school')).toBe(false);
		expect(announcementTargetNeedsEntity('all_students')).toBe(false);
		expect(announcementTargetNeedsEntity('class_group')).toBe(true);
	});

	it('uses the school-wide kind label without an entity suffix', () => {
		expect(resolveAnnouncementTargetLabel(target({ targetKind: 'school' }), {
			academic: { classes: [], gradeLevels: [] },
			detail: { students: new Map(), guardians: new Map(), staff: new Map() },
			labelForKind: kind => kind === 'school' ? 'All school' : kind,
		})).toBe('All school');
	});
});

describe('announcement detail URL', () => {
	it('reads the announcement id from the pathname', () => {
		expect(announcementDetailIdFromUrl(new URL('http://localhost/school/announcements/ann-42'))).toBe('ann-42');
		expect(announcementDetailIdFromUrl(new URL('http://localhost/school/announcements'))).toBeUndefined();
	});
});
