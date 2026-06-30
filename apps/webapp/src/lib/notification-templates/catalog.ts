export const NOTIFICATION_TEMPLATE_KEYS = [
	'announcement.published',
	'report_card.published',
	'attendance.recorded',
	'assessment.result_recorded',
	'incident.recorded',
	'assessment.due_soon',
	'homework.due_soon',
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
			'homework.due_soon',
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

export const NOTIFICATION_TEMPLATE_VARIABLES: Record<NotificationTemplateKey, readonly string[]> = {
	'announcement.published': ['schoolName', 'announcementTitle', 'announcementBody'],
	'report_card.published': ['schoolName', 'studentName'],
	'attendance.recorded': ['schoolName', 'studentName', 'status', 'sessionTitle'],
	'assessment.result_recorded': ['schoolName', 'assessmentTitle'],
	'incident.recorded': ['schoolName', 'incidentTitle', 'incidentDescription'],
	'assessment.due_soon': ['schoolName', 'assessmentTitle', 'dueDate'],
	'homework.due_soon': ['schoolName', 'homeworkTitle', 'dueDate'],
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
	inviteUrl: 'https://school.edaya.app/invite/example',
	expiresAt: 'March 20, 2026',
	actorKind: 'staff',
};

export interface NotificationChannelTemplate {
	subject?: string;
	body: string;
}

export interface NotificationTemplateEntry {
	email?: NotificationChannelTemplate;
	in_app?: NotificationChannelTemplate;
}

export type NotificationTemplateDocument = Record<
	NotificationTemplateKey,
	NotificationTemplateEntry
>;

export type NotificationChannel = 'email' | 'in_app';

export function isEmailOnlyTemplateKey(key: NotificationTemplateKey): boolean {
	return key === ACCOUNT_INVITATION_TEMPLATE_KEY;
}

export function channelsForTemplateKey(key: NotificationTemplateKey): NotificationChannel[] {
	return isEmailOnlyTemplateKey(key) ? ['email'] : ['email', 'in_app'];
}
