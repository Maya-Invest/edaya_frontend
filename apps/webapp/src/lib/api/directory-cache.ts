import { parseApiResponse } from './http';

interface CachedPage { etag: string; text: string; size: number }

/** Revalidate every protected page before returning it, including Back navigation. */
export class DirectoryCache {
	private pages = new Map<string, CachedPage>();
	private scope = '';
	private generation = 0;
	private size = 0;

	clear() {
		this.generation++;
		this.scope = '';
		this.pages.clear();
		this.size = 0;
	}

	async read<T>(scope: string, path: string, send: (etag?: string) => Promise<Response>): Promise<T> {
		if (this.scope !== scope) {
			this.clear();
			this.scope = scope;
		}
		const generation = this.generation;
		const current = () => {
			if (this.generation !== generation)
				throw new DOMException('Directory scope changed', 'AbortError');
		};
		const retained = this.pages.get(path);
		let response = await send(retained?.etag);
		current();
		if (response.status === 304) {
			if (retained && this.pages.get(path) === retained) {
				this.pages.delete(path);
				this.pages.set(path, retained);
				return JSON.parse(retained.text) as T;
			}
			response = await send();
			current();
		}
		if (!response.ok) {
			if (response.status === 401 || response.status === 403)
				this.clear();
			return parseApiResponse<T>(path, response);
		}
		const text = await response.text();
		current();
		const parsed: T = JSON.parse(text);
		const etag = response.headers.get('ETag');
		const old = this.pages.get(path);
		if (old) {
			this.pages.delete(path);
			this.size -= old.size;
		}
		const size = text.length * 2;
		const budget = 1024 * 1024;
		if (etag && size <= budget && !response.headers.get('Cache-Control')?.includes('no-store')) {
			while (this.pages.size >= 32 || this.size + size > budget) {
				const first = this.pages.keys().next().value!;
				this.size -= this.pages.get(first)!.size;
				this.pages.delete(first);
			}
			this.pages.set(path, { etag, text, size });
			this.size += size;
		}
		return parsed;
	}
}

export const directoryCache = new DirectoryCache();
