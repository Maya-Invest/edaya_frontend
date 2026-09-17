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
	'family_feedback.opened',
	'family_feedback.reminder',
	'family_feedback.published',
	'family_feedback.purge_reminder',
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
		keys: [
			'announcement.published',
			'activity.reminder',
			'calendar.event_reminder',
			'family_feedback.opened',
			'family_feedback.reminder',
			'family_feedback.published',
			'family_feedback.purge_reminder',
		],
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
	'family_feedback.opened': 'familyFeedbackOpened',
	'family_feedback.reminder': 'familyFeedbackReminder',
	'family_feedback.published': 'familyFeedbackPublished',
	'family_feedback.purge_reminder': 'familyFeedbackPurgeReminder',
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

export const NOTIFICATION_TEMPLATE_SAMPLE_VALUES: Record<string, string> = {
	schoolName: 'Edaya Academy',
	announcementTitle: 'Parent-teacher meetings',
	announcementBody: 'Meetings will be held on March 12.',
	announcementBodyShort: 'Meetings on March 12.',
	priorityLabel: 'Important',
	studentName: 'Ada Lovelace',
	periodName: 'Term 2',
	classGroupName: '6th — A',
	status: 'Absent',
	statusLabel: 'Absent',
	sessionTitle: 'Mathematics — Period 2',
	sessionDate: 'March 10, 2026',
	sessionTime: '9:00 AM',
	sessionTimeRange: '9:00–9:45 AM',
	assessmentTitle: 'Mid-term exam',
	subjectName: 'Mathematics',
	score: '16',
	maxScore: '20',
	scoreDisplay: '16/20',
	incidentTitle: 'Late arrival',
	incidentDescription: 'Student arrived 15 minutes after the bell.',
	incidentDate: 'March 10, 2026',
	incidentKindLabel: 'Punctuality',
	dueDate: 'March 15, 2026',
	dueDateLabel: 'March 15',
	activityName: 'Chess club',
	startDate: 'March 10, 2026 at 4:00 PM',
	endDate: 'March 10, 2026 at 5:30 PM',
	dateRange: 'March 10, 2026 · 4:00–5:30 PM',
	activitySchedule: 'Tuesdays 4:00 PM',
	coachName: 'Coach Martin',
	activityCategory: 'Clubs',
	eventTitle: 'Sports day',
	scopeLabel: 'Whole school',
	inviteeName: 'Jane Smith',
	inviteUrl: 'https://school.edayaplus.com/invite/example',
	expiresAt: 'March 20, 2026',
	actorKind: 'staff',
	teacherName: 'Camille Dubois',
	closesAtLabel: 'March 30, 2026',
	purgeAtLabel: 'June 15, 2026',
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

export function isNotificationTemplateKey(
	value: string | null | undefined,
): value is NotificationTemplateKey {
	return Boolean(value && (NOTIFICATION_TEMPLATE_KEYS as readonly string[]).includes(value));
}

export function templateKeyFromPathname(pathname: string): NotificationTemplateKey | null {
	const segment = decodeURIComponent(pathname.replace(/\/$/, '').split('/').pop() ?? '');
	return isNotificationTemplateKey(segment) ? segment : null;
}

export function copyTypesForTemplateKey(key: NotificationTemplateKey): NotificationCopyType[] {
	return isInvitationTemplateKey(key)
		? ['rich_message']
		: ['base_message', 'rich_message', 'simple_message'];
}

export function gatedChannelsForTemplateKey(key: NotificationTemplateKey): NotificationGatedChannel[] {
	return isInvitationTemplateKey(key) ? [] : ['email', 'push', 'sms'];
}

export function previewChannelsForTemplateKey(key: NotificationTemplateKey): NotificationSendChannel[] {
	return isInvitationTemplateKey(key) ? ['email'] : ['in_app', 'email', 'push', 'sms'];
}

export function listChannelsForTemplateKey(key: NotificationTemplateKey): NotificationSendChannel[] {
	return isInvitationTemplateKey(key) ? ['email'] : ['in_app', 'email', 'push', 'sms'];
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
