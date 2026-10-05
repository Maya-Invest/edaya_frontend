import { expect, test } from 'bun:test';
import { messageQueryKey } from '../../../src/routes/(app)/school/messages/message-query-key';
test('message selection and filters own loading while reply navigation preserves drafts', () => {
    const base = new URL('http://local/school/messages/one?status=awaiting_school&order=latest');
    const modal = new URL(base); modal.searchParams.set('modal', 'reply'); modal.searchParams.set('modalStep', 'confirm');
    expect(messageQueryKey(modal)).toBe(messageQueryKey(base));
    for (const key of ['view', 'status', 'order', 'offset']) {
        const changed = new URL(base); changed.searchParams.set(key, 'different');
        expect(messageQueryKey(changed)).not.toBe(messageQueryKey(base));
    }
    const selected = new URL(base); selected.pathname = '/school/messages/two';
    expect(messageQueryKey(selected)).not.toBe(messageQueryKey(base));
});
