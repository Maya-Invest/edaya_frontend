import type { AuthTerms } from '$lib/auth/client';

type Document = NonNullable<AuthTerms['document']>;
const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/** Legacy servers remain readable during the backend-first rollout. */
export function termsReaderHtml(document: Document): string {
	const body = document.html ?? document.sections.map(section => `<section><h2>${escapeHtml(section.heading)}</h2>${section.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section>`).join('');
	return `<!doctype html><html lang="${document.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escapeHtml(document.title)}</title></head><body>${body}</body></html>`;
}

/** Same-origin access lets the host provide keyboard dismissal; scripts remain sandboxed. */
export function prepareTermsReader(frame: HTMLIFrameElement, close: () => void, next: () => void, previous: () => void): () => void {
	const document = frame.contentDocument;
	if (!document)
		return () => {};
	const host = getComputedStyle(frame);
	const style = document.createElement('style');
	style.textContent = `
		:root { font-family: ${host.fontFamily}; font-size: ${host.fontSize}; color: ${host.color}; }
		body { margin: 0; padding: 0 1rem 1rem; line-height: 1.6; overflow-wrap: anywhere; }
		h1, h2, h3, h4 { line-height: 1.3; } h1 { font-size: 1.4em; } h2 { font-size: 1.15em; margin-top: 1.5em; }
		ul, ol { padding-left: 1.5em; } li + li { margin-top: .5em; }
		a { color: hsl(${host.getPropertyValue('--primary')}); text-decoration: underline; }
		:focus-visible { outline: 2px solid hsl(${host.getPropertyValue('--primary')}); outline-offset: 2px; }
	`;
	document.head.appendChild(style);
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			event.preventDefault();
			close();
		}
		if (event.key === 'Tab') {
			const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')];
			const active = document.activeElement;
			if (event.shiftKey && (active === links[0] || active === document.body)) {
				event.preventDefault();
				previous();
			}
			else if (!event.shiftKey && (links.length === 0 || active === links.at(-1))) {
				event.preventDefault();
				next();
			}
		}
	};
	document.addEventListener('keydown', onKeyDown);
	return () => document.removeEventListener('keydown', onKeyDown);
}
