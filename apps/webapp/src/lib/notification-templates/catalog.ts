import type { SchoolNotificationTemplatesRow } from '$lib/api/notification-templates-data';

export const NOTIFICATION_TEMPLATE_KEYS = [
	'announcement.published',
	'report_card.published',
	'attendance.recorded',
	'assessment.result_recorded',
	'incident.recorded',
	'assessment.due_soon',
	'activity.reminder',
	'calendar.event_reminder',
	'account_invitation',
] as const;

export type NotificationTemplateKey = typeof NOTIFICATION_TEMPLATE_KEYS[number];

export type NotificationTemplateCategory
	= | 'communications'
		| 'academic'
		| 'attendance'
		| 'invitations';

export const NOTIFICATION_TEMPLATE_CATEGORIES: {
	key: NotificationTemplateCategory;
	keys: NotificationTemplateKey[];
}[] = [
	{
		key: 'communications',
		keys: ['announcement.published', 'activity.reminder', 'calendar.event_reminder'],
	},
	{
		key: 'academic',
		keys: [
			'report_card.published',
			'assessment.result_recorded',
			'assessment.due_soon',
		],
	},
	{
		key: 'attendance',
		keys: ['attendance.recorded', 'incident.recorded'],
	},
	{
		key: 'invitations',
		keys: ['account_invitation'],
	},
];

export const ACCOUNT_INVITATION_TEMPLATE_KEY = 'account_invitation' as const satisfies NotificationTemplateKey;

export const NOTIFICATION_TEMPLATE_FIELDS = {
	'announcement.published': 'announcementPublished',
	'report_card.published': 'reportCardPublished',
	'attendance.recorded': 'attendanceRecorded',
	'assessment.result_recorded': 'assessmentResultRecorded',
	'incident.recorded': 'incidentRecorded',
	'assessment.due_soon': 'assessmentDueSoon',
	'activity.reminder': 'activityReminder',
	'calendar.event_reminder': 'calendarEventReminder',
	'account_invitation': 'accountInvitation',
} as const satisfies Record<NotificationTemplateKey, string>;

export type NotificationCopyType = 'base_message' | 'rich_message' | 'simple_message';
export type NotificationSendChannel = 'in_app' | 'email' | 'push' | 'sms';
export type NotificationGatedChannel = 'email' | 'push' | 'sms';

export const NOTIFICATION_CHANNEL_CATALOG = {
	in_app: { type: 'base_message' as const, gated: false },
	email: { type: 'rich_message' as const, gated: true, flag: 'enable_email' as const },
	push: { type: 'base_message' as const, gated: true, flag: 'enable_push' as const },
	sms: { type: 'simple_message' as const, gated: true, flag: 'enable_sms' as const },
};

export const NOTIFICATION_TEMPLATE_VARIABLES: Record<NotificationTemplateKey, readonly string[]> = {
	'announcement.published': ['schoolName', 'announcementTitle', 'announcementBody'],
	'report_card.published': ['schoolName', 'studentName'],
	'attendance.recorded': ['schoolName', 'studentName', 'status', 'sessionTitle'],
	'assessment.result_recorded': ['schoolName', 'assessmentTitle'],
	'incident.recorded': ['schoolName', 'incidentTitle', 'incidentDescription'],
	'assessment.due_soon': ['schoolName', 'assessmentTitle', 'dueDate'],
	'activity.reminder': ['schoolName', 'activityName', 'startDate'],
	'calendar.event_reminder': ['schoolName', 'eventTitle', 'startDate'],
	'account_invitation': ['schoolName', 'inviteeName', 'inviteUrl', 'expiresAt', 'actorKind'],
};

export const NOTIFICATION_TEMPLATE_SAMPLE_VALUES: Record<string, string> = {
	schoolName: 'Edaya Academy',
	announcementTitle: 'Parent-teacher meetings',
	announcementBody: 'Meetings will be held on March 12.',
	studentName: 'Ada Lovelace',
	status: 'Absent',
	sessionTitle: 'Mathematics — Period 2',
	assessmentTitle: 'Mid-term exam',
	incidentTitle: 'Late arrival',
	incidentDescription: 'Student arrived 15 minutes after the bell.',
	homeworkTitle: 'Chapter 5 exercises',
	dueDate: 'March 15, 2026',
	activityName: 'Chess club',
	startDate: 'March 10, 2026 at 4:00 PM',
	eventTitle: 'Sports day',
	inviteeName: 'Jane Smith',
	inviteUrl: 'https://school.edayaplus.com/invite/example',
	expiresAt: 'March 20, 2026',
	actorKind: 'staff',
};

export interface BaseMessageTemplate {
	title: string;
	body: string;
}

export interface RichMessageTemplate {
	subject: string;
	body: string;
}

export interface SimpleMessageTemplate {
	body: string;
}

export interface EventNotificationTemplateEntry {
	enable_email: boolean;
	enable_push: boolean;
	enable_sms: boolean;
	base_message: BaseMessageTemplate;
	rich_message: RichMessageTemplate;
	simple_message: SimpleMessageTemplate;
}

export interface InvitationNotificationTemplateEntry {
	rich_message: RichMessageTemplate;
	simple_message: SimpleMessageTemplate;
}

export function isInvitationTemplateKey(key: NotificationTemplateKey): boolean {
	return key === ACCOUNT_INVITATION_TEMPLATE_KEY;
}

export function copyTypesForTemplateKey(key: NotificationTemplateKey): NotificationCopyType[] {
	return isInvitationTemplateKey(key)
		? ['rich_message', 'simple_message']
		: ['base_message', 'rich_message', 'simple_message'];
}

export function gatedChannelsForTemplateKey(key: NotificationTemplateKey): NotificationGatedChannel[] {
	return isInvitationTemplateKey(key) ? [] : ['email', 'push', 'sms'];
}

export function previewChannelsForTemplateKey(key: NotificationTemplateKey): NotificationSendChannel[] {
	return isInvitationTemplateKey(key) ? ['email', 'sms'] : ['in_app', 'email', 'push', 'sms'];
}

export function listChannelsForTemplateKey(key: NotificationTemplateKey): NotificationSendChannel[] {
	return isInvitationTemplateKey(key) ? ['email', 'sms'] : ['in_app', 'email', 'push', 'sms'];
}

export function copyTypeForChannel(channel: NotificationSendChannel): NotificationCopyType {
	return NOTIFICATION_CHANNEL_CATALOG[channel].type;
}

export function catalogFieldForKey(key: NotificationTemplateKey): string {
	return NOTIFICATION_TEMPLATE_FIELDS[key];
}

export function readEventTemplateEntry(
	document: SchoolNotificationTemplatesRow | null | undefined,
	key: NotificationTemplateKey,
): EventNotificationTemplateEntry | undefined {
	if (!document || isInvitationTemplateKey(key)) {
		return undefined;
	}
	const field = catalogFieldForKey(key) as keyof SchoolNotificationTemplatesRow;
	return document[field] as EventNotificationTemplateEntry | undefined;
}

export function readInvitationTemplateEntry(
	document: SchoolNotificationTemplatesRow | null | undefined,
): InvitationNotificationTemplateEntry | undefined {
	return document?.accountInvitation;
}
