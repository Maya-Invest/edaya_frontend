import { describe, expect, it } from 'bun:test';
import { sanitizeNotificationHtml } from '$lib/notification-templates/sanitize-html';

describe('sanitizeNotificationHtml', () => {
	it('keeps safe email markup and placeholder links', () => {
		const html = '<p>Hello <strong>Ada</strong> <a href="{{inviteUrl}}">Open</a></p>';
		expect(sanitizeNotificationHtml(html)).toBe(html);
	});

	it('strips scripts and unsafe hrefs', () => {
		const html = '<p>Hi<script>alert(1)</script></p><a href="javascript:alert(1)">x</a>';
		const sanitized = sanitizeNotificationHtml(html);
		expect(sanitized).not.toContain('script');
		expect(sanitized).not.toContain('javascript:');
		expect(sanitized).toContain('Hi');
	});
});
