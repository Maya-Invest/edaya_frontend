export function messagePresentation(destination: string, authorKind: string): { outgoing: boolean; labelKey: string } {
	if (destination === 'teacher') {
		return { outgoing: authorKind === 'teacher', labelKey: authorKind === 'teacher' ? 'messages.teacherMessage' : 'messages.guardianMessage' };
	}
	return { outgoing: authorKind === 'staff', labelKey: authorKind === 'staff' ? 'messages.sentMessage' : 'messages.receivedMessage' };
}

export function messageTimestamp(value: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
