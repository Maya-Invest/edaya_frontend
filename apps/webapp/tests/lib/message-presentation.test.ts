import { expect, test } from 'bun:test';
import { messagePresentation, messageTimestamp } from '../../src/routes/(app)/school/messages/message-presentation';

test('every school staff reply belongs to the sent side', () => {
	expect(messagePresentation('school', 'staff')).toEqual({ outgoing: true, labelKey: 'messages.sentMessage' });
	expect(messagePresentation('school', 'guardian')).toEqual({ outgoing: false, labelKey: 'messages.receivedMessage' });
});

test('oversight labels participants without claiming staff sent a message', () => {
	expect(messagePresentation('teacher', 'teacher')).toEqual({ outgoing: true, labelKey: 'messages.teacherMessage' });
	expect(messagePresentation('teacher', 'guardian')).toEqual({ outgoing: false, labelKey: 'messages.guardianMessage' });
});

test('timestamps follow the selected interface language', () => {
	expect(messageTimestamp('2026-10-09T12:26:10Z', 'fr-FR')).toContain('oct.');
	expect(messageTimestamp('2026-10-09T12:26:10Z', 'en-US')).toContain('Oct');
	expect(messageTimestamp('2026-10-09T12:26:10Z', 'fr-FR')).not.toContain('T12:');
});
