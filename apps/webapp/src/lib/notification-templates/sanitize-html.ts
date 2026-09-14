const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'A', 'UL', 'OL', 'LI']);
const REMOVE_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'IMG']);

function isSafeHref(value: string): boolean {
	const trimmed = value.trim();
	if (trimmed.startsWith('{{') && trimmed.includes('}}')) {
		return true;
	}
	const lower = trimmed.toLowerCase();
	return lower.startsWith('https://')
		|| lower.startsWith('http://')
		|| lower.startsWith('mailto:');
}

function sanitizeElement(element: Element): void {
	const children = Array.from(element.childNodes);
	for (const child of children) {
		if (child.nodeType === Node.COMMENT_NODE) {
			element.removeChild(child);
			continue;
		}
		if (child.nodeType !== Node.ELEMENT_NODE) {
			continue;
		}

		const el = child as Element;
		const tag = el.tagName.toUpperCase();
		if (REMOVE_TAGS.has(tag) || !ALLOWED_TAGS.has(tag)) {
			if (REMOVE_TAGS.has(tag)) {
				element.removeChild(el);
				continue;
			}
			while (el.firstChild) {
				element.insertBefore(el.firstChild, el);
			}
			element.removeChild(el);
			sanitizeElement(element);
			return;
		}

		for (const attr of Array.from(el.attributes)) {
			const name = attr.name.toLowerCase();
			if (tag === 'A' && name === 'href' && isSafeHref(attr.value)) {
				continue;
			}
			el.removeAttribute(attr.name);
		}
		sanitizeElement(el);
	}
}

function sanitizeWithoutDom(html: string): string {
	let out = html.replace(/<!--[\s\S]*?-->/g, '');
	out = out.replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
	out = out.replace(/<(link|meta|img)\b[^>]*>/gi, '');
	return out.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (full, rawTag: string, rawAttrs: string) => {
		const closing = full.startsWith('</');
		const tag = rawTag.toUpperCase();
		if (!ALLOWED_TAGS.has(tag)) {
			return '';
		}
		const lower = rawTag.toLowerCase();
		if (closing) {
			return lower === 'br' ? '' : `</${lower}>`;
		}
		if (lower === 'br') {
			return '<br>';
		}
		if (lower === 'a') {
			const hrefMatch = rawAttrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)')/i);
			const href = hrefMatch?.[2] ?? hrefMatch?.[3] ?? '';
			if (href && isSafeHref(href)) {
				return `<a href="${href}">`;
			}
			return '<a>';
		}
		return `<${lower}>`;
	});
}

export function sanitizeNotificationHtml(html: string): string {
	if (!html.trim()) {
		return '';
	}
	if (typeof DOMParser === 'undefined') {
		return sanitizeWithoutDom(html);
	}

	const doc = new DOMParser().parseFromString(`<div id="edaya-html-root">${html}</div>`, 'text/html');
	const root = doc.getElementById('edaya-html-root');
	if (!root) {
		return '';
	}
	sanitizeElement(root);
	return root.innerHTML;
}
