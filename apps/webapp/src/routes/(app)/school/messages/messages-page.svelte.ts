import type { components } from '$lib/api/schema';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { resolvePageLoad } from '$lib/queries/page-status';
import { ApiError } from '@maya-invest/edaya-api-client';
import { SvelteMap } from 'svelte/reactivity';
import { get } from 'svelte/store';
import { messageQueryKey } from './message-query-key';

type Summary = components['schemas']['ConversationsResponse']['items'][number];
type Detail = components['schemas']['ConversationDetailResponse'];
type ListInput = Omit<Parameters<ReturnType<typeof getBrowserSchoolClient>['queries']['listConversations']>[0], 'offset' | 'limit'>;
const PAGE_SIZE = 25;
export class MessagesPageState {
    readonly queryKey = messageQueryKey;
    items = $state<Summary[]>([]);
    detail = $state<Detail | null>(null);
    total = $state(0);
    unreadCount = $state(0);
    private offset = 0;
    private listKey = '';
    loadingMore = $state(false);
    loadMoreError = $state(false);
    private exhausted = $state(false);
    busy = $state(false);
    error = $state('');
    draft = $state('');
    sending = $state(false);
    needsReview = $state(false);
    private replyVersion: number | null = null;
    beginReply() {
        this.replyVersion = this.detail?.conversation.version ?? null;
        this.needsReview = false;
    }

    private generation = 0;
    private retry: {
        digest: string;
        id: string;
    } | null = null;

    private loadedIdentity = '';
    private loadingOlder = false;
    constructor(private readonly url: () => URL) { }
    get identity() {
        return `${authSession.subjectId}|${authSession.schoolId}|${authSession.sessionKind}|${authSession.userId}`;
    }

    get selectedId() {
        return this.url().pathname.split('/').filter(Boolean)[2];
    }

    get destination(): 'all' | 'school' | 'teacher' {
        const params = this.url().searchParams;
        const type = params.get('type') ?? params.get('view');
        return type === 'school' || type === 'teacher' ? type : 'all';
    }

    private listInput(): ListInput {
        const url = this.url();
        const status = url.searchParams.get('status');
        return {
            ...(this.destination !== 'all' ? { destination: this.destination } : {}),
            ...(status === 'awaiting_school' || status === 'awaiting_guardian' || status === 'resolved' ? { status } : {}),
            order: url.searchParams.get('order') === 'oldest_awaiting' ? 'oldest_awaiting' : 'latest',
        };
    }

    private get currentListKey() {
        return JSON.stringify([this.identity, this.listInput()]);
    }

    get hasMore() {
        return this.items.length < this.total && !this.exhausted && !this.loadMoreError;
    }

    private async loadVisibleList(input: ListInput, count: number, isCurrent: () => boolean) {
        const items: Summary[] = [];
        let offset = 0;
        let total = 0;
        let unreadCount = 0;
        let exhausted = false;
        do {
            const page = await getBrowserSchoolClient().queries.listConversations({ ...input, offset, limit: PAGE_SIZE });
            if (!isCurrent())
                throw new Error('Conversation list changed during refresh');
            items.push(...page.items);
            offset += page.items.length;
            total = page.total;
            unreadCount = page.unreadCount;
            exhausted = page.items.length === 0 || offset >= total;
        } while (!exhausted && offset < count);
        return { items: [...new SvelteMap(items.map(item => [item.id, item])).values()], offset, total, unreadCount, exhausted };
    }

    async loadMore() {
        if (this.busy || this.loadingMore || !this.hasMore || this.listKey !== this.currentListKey)
            return;
        const generation = this.generation;
        const key = this.currentListKey;
        this.loadingMore = true;
        try {
            const page = await getBrowserSchoolClient().queries.listConversations({ ...this.listInput(), offset: this.offset, limit: PAGE_SIZE });
            if (generation !== this.generation || key !== this.currentListKey)
                return;
            this.items = [...new SvelteMap([...this.items, ...page.items].map(item => [item.id, item])).values()];
            this.offset += page.items.length;
            this.total = page.total;
            this.unreadCount = page.unreadCount;
            this.exhausted = page.items.length === 0 || this.offset >= page.total;
        }
        catch {
            if (generation === this.generation && key === this.currentListKey)
                this.loadMoreError = true;
        }
        finally {
            if (generation === this.generation)
                this.loadingMore = false;
        }
    }

    async retryLoadMore() {
        this.loadMoreError = false;
        await this.loadMore();
    }

    clear() {
        this.generation++;
        this.busy = false;
        this.loadingOlder = false;
        this.items = [];
        this.detail = null;
        this.draft = '';
        this.retry = null;
        this.replyVersion = null;
        this.needsReview = false;
        this.error = '';
        this.total = 0;
        this.offset = 0;
        this.listKey = '';
        this.exhausted = false;
        this.loadingMore = false;
        this.loadMoreError = false;
        this.unreadCount = 0;
        this.sending = false;
    }

    query = (url: URL) => resolvePageLoad(url, {
        empty: () => ({}),
        load: async () => {
            await this.load();
            return {};
        },
        hasItems: () => true,
        errorMessage: get(t)('messages.failed'),
    });

    async load() {
        if (this.loadedIdentity !== this.identity) {
            this.clear();
            this.loadedIdentity = this.identity;
        }
        const identity = this.identity;
        const generation = ++this.generation;
        const url = this.url();
        const selected = this.selectedId;
        const key = this.currentListKey;
        if (key !== this.listKey) {
            this.items = [];
            this.total = 0;
            this.offset = 0;
            this.exhausted = false;
            this.loadMoreError = false;
        }
        const isCurrent = () => identity === this.identity && generation === this.generation && key === this.currentListKey && selected === this.selectedId;
        this.loadingMore = false;
        this.busy = true;
        try {
            const [page, detail] = await Promise.all([
                this.loadVisibleList(this.listInput(), Math.max(PAGE_SIZE, this.offset), isCurrent),
                selected ? getBrowserSchoolClient().queries.getConversation({ conversationId: selected, limit: 50 }) : Promise.resolve(null),
            ]);
            if (!isCurrent())
                return;
            if (this.detail?.conversation.id !== detail?.conversation.id) {
                this.draft = '';
                this.retry = null;
                this.replyVersion = null;
                this.needsReview = false;
            }
            const previous = this.detail;
            const older = previous && detail && previous.conversation.id === detail.conversation.id && detail.messages.length
                ? previous.messages.filter(message => message.sequence < detail.messages[0].sequence)
                : [];
            this.items = page.items;
            this.listKey = key;
            this.offset = page.offset;
            this.exhausted = page.exhausted;
            this.total = page.total;
            this.unreadCount = page.unreadCount;
            this.detail = detail && older.length
                ? { ...detail, messages: [...older, ...detail.messages], hasMore: previous?.hasMore ?? detail.hasMore }
                : detail;
            if (url.searchParams.get('modal') === 'reply' && this.replyVersion === null)
                this.replyVersion = detail?.conversation.version ?? null;
            this.error = '';
            if (detail?.messages.length) {
                const through = detail.messages[detail.messages.length - 1].sequence;
                await getBrowserSchoolClient().commands.markConversationRead({ conversationId: detail.conversation.id, throughSequence: through });
                if (isCurrent()) {
                    this.items = this.items.map(row => row.id === detail.conversation.id ? { ...row, unread: false } : row);
                    this.unreadCount = Math.max(0, page.unreadCount - (detail.conversation.unread ? 1 : 0));
                }
            }
        }
        catch (e) {
            if (isCurrent()) {
                this.error = get(t)('messages.failed');
                if (e instanceof ApiError && (e.status === 403 || e.status === 404))
                    this.clear();
            }
            throw e;
        }
        finally {
            if (generation === this.generation)
                this.busy = false;
        }
    }

    async refresh() {
        if (this.busy || this.loadingMore)
            return;
        try {
            await this.load();
        }
        catch { /* The visible error owns retry feedback. */ }
    }

    async older() {
        const current = this.detail;
        if (!current?.hasMore || !current.messages.length || this.loadingOlder)
            return;
        const identity = this.identity;
        const generation = this.generation;
        this.loadingOlder = true;
        try {
            const page = await getBrowserSchoolClient().queries.getConversation({ conversationId: current.conversation.id, beforeSequence: current.messages[0].sequence, limit: 50 });
            if (identity === this.identity && generation === this.generation && this.detail?.conversation.id === current.conversation.id) {
                const messages = [...page.messages, ...this.detail.messages];
                this.detail = { ...this.detail, messages: messages.filter((message, index) => messages.findIndex(other => other.sequence === message.sequence) === index), hasMore: page.hasMore };
            }
        }
        catch {
            if (identity === this.identity && generation === this.generation)
                this.error = get(t)('messages.failed');
        }
        finally {
            if (identity === this.identity)
                this.loadingOlder = false;
        }
    }

    async mutate(kind: 'reply' | 'resolve'): Promise<boolean> {
        const current = this.detail?.conversation;
        if (!current || !current.allowedActions[kind === 'reply' ? 'reply' : 'resolve'] || this.sending || (kind === 'reply' && (!this.draft.trim() || this.needsReview)))
            return false;
        const identity = this.identity;
        const input = { conversationId: current.id, expectedVersion: kind === 'reply' ? this.replyVersion ?? current.version : current.version, ...(kind === 'reply' ? { body: this.draft.trim() } : {}) };
        const digest = JSON.stringify([kind, input]);
        if (this.retry?.digest !== digest)
            this.retry = { digest, id: crypto.randomUUID() };
        const requestId = this.retry.id;
        this.sending = true;
        const result = await runMutation(async () => {
            try {
                return kind === 'reply'
                    ? await getBrowserSchoolClient().commands.replyConversation({ ...input, body: this.draft.trim(), requestId })
                    : await getBrowserSchoolClient().commands.resolveConversation({ ...input, requestId });
            }
            catch (e) {
                if (e instanceof ApiError && JSON.stringify(e.body).includes('CONVERSATION_CHANGED')) {
                    await this.refresh();
                    if (identity === this.identity) {
                        this.needsReview = true;
                        this.error = get(t)('messages.changed');
                    }
                    throw new Error(get(t)('messages.changed'));
                }
                throw e;
            }
        }, { versionKeys: ['inbox'], successMessage: get(t)(kind === 'reply' ? 'messages.sent' : 'messages.resolved'), onSuccess: async () => {
            if (identity !== this.identity)
                return;
            this.draft = '';
            this.retry = null;
            await this.load();
        } });
        if (identity === this.identity)
            this.sending = false;
        return result !== null;
    }
}
