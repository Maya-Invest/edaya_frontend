import { describe, expect, it } from 'bun:test';
import {
	isNotificationTemplateKey,
	NOTIFICATION_TEMPLATE_KEYS,
	NOTIFICATION_TEMPLATE_VARIABLES,
	templateKeyFromPathname,
} from '$lib/notification-templates/catalog';

const BACKEND_VARIABLES: Record<string, readonly string[]> = {
	'announcement.published': [
		'schoolName',
		'announcementTitle',
		'announcementBody',
		'announcementBodyShort',
		'priorityLabel',
	],
	'report_card.published': ['schoolName', 'studentName', 'periodName', 'classGroupName'],
	'attendance.recorded': [
		'schoolName',
		'studentName',
		'status',
		'statusLabel',
		'sessionTitle',
		'sessionDate',
		'sessionTime',
		'sessionTimeRange',
		'classGroupName',
	],
	'assessment.result_recorded': [
		'schoolName',
		'studentName',
		'assessmentTitle',
		'subjectName',
		'periodName',
		'score',
		'maxScore',
		'scoreDisplay',
	],
	'incident.recorded': [
		'schoolName',
		'studentName',
		'incidentTitle',
		'incidentDescription',
		'incidentDate',
		'incidentKindLabel',
	],
	'assessment.due_soon': [
		'schoolName',
		'assessmentTitle',
		'dueDate',
		'dueDateLabel',
		'classGroupName',
		'subjectName',
	],
	'activity.reminder': [
		'schoolName',
		'activityName',
		'startDate',
		'endDate',
		'dateRange',
		'activitySchedule',
		'coachName',
		'activityCategory',
	],
	'calendar.event_reminder': [
		'schoolName',
		'eventTitle',
		'startDate',
		'endDate',
		'dateRange',
		'scopeLabel',
	],
	'account_invitation': ['schoolName', 'inviteeName', 'inviteUrl', 'expiresAt', 'actorKind'],
};

describe('notification template catalog', () => {
	it('matches backend placeholder names per template key', () => {
		expect(Object.keys(BACKEND_VARIABLES).sort()).toEqual([...NOTIFICATION_TEMPLATE_KEYS].sort());
		for (const key of NOTIFICATION_TEMPLATE_KEYS) {
			expect([...NOTIFICATION_TEMPLATE_VARIABLES[key]]).toEqual([...BACKEND_VARIABLES[key]]);
		}
	});

	it('reads a dotted template key from a detail pathname', () => {
		expect(templateKeyFromPathname('/configuration/notifications/announcement.published')).toBe(
			'announcement.published',
		);
		expect(templateKeyFromPathname('/configuration/notifications/report_card.published/')).toBe(
			'report_card.published',
		);
		expect(templateKeyFromPathname('/configuration/notifications')).toBeNull();
		expect(isNotificationTemplateKey('homework.due_soon')).toBe(false);
	});
});
