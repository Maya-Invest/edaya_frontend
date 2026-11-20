export interface PortraitReference { studentId: string; attachmentId: string }
interface Grant extends PortraitReference { checksum: string | null; downloadUrl: string }
type GrantReader = (photos: PortraitReference[], signal: AbortSignal) => Promise<{ grants: Grant[] }>;
type ByteReader = (grant: Grant, signal: AbortSignal) => Promise<Blob>;

interface Job {
	ref: PortraitReference;
	key: string;
	controller: AbortController;
	consumers: number;
	promise: Promise<Blob>;
	resolve: (blob: Blob) => void;
	reject: (error: unknown) => void;
}

const keyOf = (ref: PortraitReference) => JSON.stringify([ref.studentId, ref.attachmentId]);
const canceled = () => new DOMException('Portrait request canceled', 'AbortError');

/** Reauthorize every new read. Only checksum-versioned bytes survive a completed request. */
export class StudentPortraitCache {
	private scope = '';
	private jobs = new Map<string, Job>();
	private waiting = new Set<Job>();
	private blobs = new Map<string, { checksum: string; blob: Blob }>();
	private size = 0;
	private timer?: ReturnType<typeof setTimeout>;

	constructor(private readonly budget = 4 * 1024 * 1024) {}

	clear() {
		clearTimeout(this.timer);
		this.timer = undefined;
		for (const job of this.jobs.values()) {
			job.controller.abort();
			job.reject(canceled());
		}
		this.jobs.clear();
		this.waiting.clear();
		this.blobs.clear();
		this.size = 0;
		this.scope = '';
	}

	private evict(key: string) {
		const old = this.blobs.get(key);
		if (old)
			this.size -= old.blob.size;
		this.blobs.delete(key);
	}

	read(scope: string, ref: PortraitReference, signal: AbortSignal, grants: GrantReader, bytes: ByteReader): Promise<Blob> {
		if (signal.aborted)
			return Promise.reject(canceled());
		if (scope !== this.scope) {
			this.clear();
			this.scope = scope;
		}
		const key = keyOf(ref);
		let job = this.jobs.get(key);
		if (!job) {
			let resolve!: Job['resolve'];
			let reject!: Job['reject'];
			const promise = new Promise<Blob>((ok, fail) => {
				resolve = ok;
				reject = fail;
			});
			job = { promise, resolve, reject, ref, key, consumers: 0, controller: new AbortController() };
			this.jobs.set(key, job);
			this.waiting.add(job);
			this.timer ??= setTimeout(() => {
				this.timer = undefined;
				const pending = [...this.waiting];
				this.waiting.clear();
				for (let start = 0; start < pending.length; start += 25)
					void this.fetchBatch(pending.slice(start, start + 25), grants, bytes);
			}, 0);
		}
		const shared = job;
		shared.consumers++;
		return new Promise<Blob>((resolve, reject) => {
			const abort = () => {
				if (--shared.consumers === 0) {
					if (this.jobs.get(key) === shared)
						this.jobs.delete(key);
					this.waiting.delete(shared);
					shared.controller.abort();
					shared.reject(canceled());
				}
				reject(canceled());
			};
			signal.addEventListener('abort', abort, { once: true });
			shared.promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
		});
	}

	private async fetchBatch(jobs: Job[], read: GrantReader, bytes: ByteReader) {
		const group = new AbortController();
		const stopIfUnused = () => {
			if (jobs.every(job => job.controller.signal.aborted))
				group.abort();
		};
		for (const job of jobs) job.controller.signal.addEventListener('abort', stopIfUnused);
		try {
			const result = await read(jobs.map(job => job.ref), group.signal);
			const allowed = new Map(result.grants.map(grant => [keyOf(grant), grant]));
			await Promise.all(jobs.map(async (job) => {
				try {
					const { key, controller: { signal } } = job;
					signal.throwIfAborted();
					const grant = allowed.get(key);
					const saved = this.blobs.get(key);
					this.evict(key);
					if (!grant)
						throw new Error('Portrait is unavailable');
					const blob = saved && grant.checksum === saved.checksum ? saved.blob : await bytes(grant, signal);
					signal.throwIfAborted();
					if (grant.checksum && blob.size > 0 && blob.size <= this.budget) {
						while (this.size + blob.size > this.budget) this.evict(this.blobs.keys().next().value!);
						this.blobs.set(key, { checksum: grant.checksum, blob });
						this.size += blob.size;
					}
					job.resolve(blob);
				}
				catch (error) {
					job.reject(error);
				}
				finally {
					if (this.jobs.get(job.key) === job)
						this.jobs.delete(job.key);
				}
			}));
		}
		catch (error) {
			for (const job of jobs) {
				if (this.jobs.get(job.key) === job) {
					this.jobs.delete(job.key);
					this.evict(job.key);
				}
				job.reject(error);
			}
		}
		finally {
			for (const job of jobs) job.controller.signal.removeEventListener('abort', stopIfUnused);
		}
	}
}

export const studentPortraitCache = new StudentPortraitCache();
