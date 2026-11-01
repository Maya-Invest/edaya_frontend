import { en } from '$lib/i18n/dictionaries/en';
import { fr } from '$lib/i18n/dictionaries/fr';
import {
	copyTypesForTemplateKey,
	isNotificationTemplateKey,
	listChannelsForTemplateKey,
	NOTIFICATION_TEMPLATE_KEYS,
	NOTIFICATION_TEMPLATE_VARIABLES,
	previewChannelsForTemplateKey,
	templateKeyFromPathname,
} from '$lib/notification-templates/catalog';
import { describe, expect, it } from 'bun:test';

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
	'family_feedback.opened': [
		'schoolName',
		'studentName',
		'teacherName',
		'subjectName',
		'classGroupName',
		'periodName',
		'closesAtLabel',
	],
	'family_feedback.reminder': [
		'schoolName',
		'studentName',
		'teacherName',
		'subjectName',
		'classGroupName',
		'periodName',
		'closesAtLabel',
	],
	'family_feedback.published': [
		'schoolName',
		'teacherName',
		'subjectName',
		'classGroupName',
		'periodName',
	],
	'family_feedback.purge_reminder': [
		'schoolName',
		'subjectName',
		'classGroupName',
		'periodName',
		'purgeAtLabel',
	],
	'account_invitation': ['schoolName', 'inviteeName', 'inviteUrl', 'expiresAt', 'actorKind'],
};

describe('notification template catalog', () => {
	it('explains every supported variable in both locales', () => {
		for (const variables of Object.values(NOTIFICATION_TEMPLATE_VARIABLES)) {
			for (const variable of variables) {
				const key = `notificationTemplates.variable.${variable}`;
				expect((en as Record<string, string>)[key]?.trim().length).toBeGreaterThan(0);
				expect((fr as Record<string, string>)[key]?.trim().length).toBeGreaterThan(0);
			}
		}
	});

	it('matches backend placeholder names per template key', () => {
		expect(Object.keys(BACKEND_VARIABLES).sort()).toEqual([...NOTIFICATION_TEMPLATE_KEYS].sort());
		for (const key of NOTIFICATION_TEMPLATE_KEYS) {
			expect([...NOTIFICATION_TEMPLATE_VARIABLES[key]]).toEqual([...BACKEND_VARIABLES[key]]);
		}
	});

	it('keeps invitation copy and preview on email until phone auth ships', () => {
		expect(copyTypesForTemplateKey('account_invitation')).toEqual(['rich_message']);
		expect(previewChannelsForTemplateKey('account_invitation')).toEqual(['email']);
		expect(listChannelsForTemplateKey('account_invitation')).toEqual(['email']);
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
