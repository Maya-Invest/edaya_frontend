import type { components } from '$lib/api/schema';
import { dev } from '$app/environment';
import { academicContext } from '$lib/academic/context.svelte';
import { createBrowserTransport } from '$lib/api/browser-transport';
import { ApiError } from '$lib/api/http';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authRequest } from '$lib/auth/client';
import { isLocalDevApi } from '$lib/env/app-env';

type Options = components['schemas']['TeacherQuickCodeOptions'];
type Expiry = components['schemas']['TeacherQuickCodeIssue']['expiry'];

export class TeacherQuickLoginState {
	options = $state<Options>();
	identifierId = $state('');
	expiry = $state<Expiry>('week');
	open = $state(false);
	busy = $state(false);
	hidden = $state(false);
	notice = $state('');
	canReveal = $state(false);
	code = $state('');
	private generation = 0;
	private disposed = false;
	private scope = academicContext.scopeGeneration;
	private request: { id: string; selection: string } | undefined;
	private timeout: ReturnType<typeof setTimeout> | undefined;
	private devTransport = createBrowserTransport(() => academicContext.yearId || undefined);

	constructor(private teacherId: string) {}

	private get current() {
		return !this.disposed && this.scope === academicContext.scopeGeneration;
	}

	clear = () => {
		this.generation++;
		clearTimeout(this.timeout);
		this.code = '';
	};

	show = () => {
		this.expiry = 'week';
		this.open = true;
		this.clear();
	};

	private load = async () => {
		const options = await getBrowserSchoolClient().authorization.teacherQuickCodeOptions({ teacherId: this.teacherId });
		if (!this.current)
			return;
		this.options = options;
		if (!options.contacts.some(i => i.id === this.identifierId))
			this.identifierId = options.contacts[0]?.id ?? '';
	};

	start = () => {
		void this.load().catch((error) => {
			if (!this.current)
				return;
			if (error instanceof ApiError && error.status === 404)
				this.hidden = true;
			else this.notice = 'quick.unavailable';
		});
		if (dev && isLocalDevApi()) {
			void authRequest<{ teacherQuickCodeReveal?: boolean }>('testing/capabilities', {}, 'GET')
				.then(({ data }) => {
					if (this.current) {
						this.canReveal = !!data?.teacherQuickCodeReveal;
					}
				})
				.catch(() => {});
		}
	};

	issue = async () => {
		if (this.busy || !this.current)
			return;
		this.clear();
		this.busy = true;
		const selection = `${this.identifierId}/${this.expiry}`;
		if (this.request?.selection !== selection)
			this.request = { id: crypto.randomUUID(), selection };
		try {
			const result = await getBrowserSchoolClient().authorization.issueTeacherQuickCode({ teacherId: this.teacherId }, { identifierId: this.identifierId, expiry: this.expiry, requestId: this.request.id });
			if (!this.current)
				return;
			this.notice = result.status === 'active' ? 'quick.sent' : result.status === 'failed' ? 'quick.failed' : 'quick.unconfirmed';
			this.open = false;
			this.request = undefined;
			await this.load();
		}
		catch {
			if (this.current) {
				this.notice = 'quick.unavailable';
			}
		}
		finally { this.busy = false; }
	};

	reveal = async () => {
		if (!dev || !this.canReveal || !isLocalDevApi() || !this.current)
			return;
		this.clear();
		const generation = this.generation;
		try {
			const result = await this.devTransport.request<{ code: string }>('POST', `/core/dev/teachers/${encodeURIComponent(this.teacherId)}/quick-login-code/reveal`, { body: {} });
			if (!this.current || generation !== this.generation || document.hidden)
				return;
			this.code = result.code;
			this.timeout = setTimeout(this.clear, Math.max(0, Math.min(60000, (this.options?.active?.expiry ?? Infinity) - Date.now())));
		}
		catch {
			if (this.current && generation === this.generation) {
				this.notice = 'quick.refreshNeeded';
			}
		}
	};

	dispose = () => {
		this.disposed = true;
		this.clear();
	};
}
