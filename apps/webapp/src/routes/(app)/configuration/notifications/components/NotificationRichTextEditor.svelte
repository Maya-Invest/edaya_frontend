<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { Bold, Italic, Link as LinkIcon, List, ListOrdered } from '$lib/icons';
	import { cn } from '$lib/utils';
	import { Editor as TiptapEditor } from '@tiptap/core';
	import Link from '@tiptap/extension-link';
	import Placeholder from '@tiptap/extension-placeholder';
	import StarterKit from '@tiptap/starter-kit';
	import { get } from 'svelte/store';

	let {
		value = $bindable(''),
		disabled = false,
		onReady,
		onFocus,
	}: {
		value?: string;
		disabled?: boolean;
		onReady?: (api: { insertPlaceholder: (text: string) => void }) => void;
		onFocus?: () => void;
	} = $props();

	let editor = $state<Editor | null>(null);
	let editorTick = $state(0);

	const boldActive = $derived.by(() => {
		void editorTick;
		return Boolean(editor?.isActive('bold'));
	});
	const italicActive = $derived.by(() => {
		void editorTick;
		return Boolean(editor?.isActive('italic'));
	});
	const linkActive = $derived.by(() => {
		void editorTick;
		return Boolean(editor?.isActive('link'));
	});
	const bulletActive = $derived.by(() => {
		void editorTick;
		return Boolean(editor?.isActive('bulletList'));
	});
	const orderedActive = $derived.by(() => {
		void editorTick;
		return Boolean(editor?.isActive('orderedList'));
	});

	function insertPlaceholder(text: string) {
		editor?.chain().focus().insertContent(text).run();
	}

	function attachEditor(element: HTMLElement) {
		const instance = new TiptapEditor({
			element,
			editable: !disabled,
			extensions: [
				StarterKit.configure({
					heading: false,
					codeBlock: false,
					code: false,
					blockquote: false,
					horizontalRule: false,
					strike: false,
					underline: false,
					link: false,
				}),
				Link.configure({
					openOnClick: false,
					autolink: true,
					isAllowedUri: (url, ctx) => {
						const trimmed = url.trim();
						if (trimmed.startsWith('{{') && trimmed.includes('}}')) {
							return true;
						}
						return ctx.defaultValidate(url);
					},
				}),
				Placeholder.configure({
					placeholder: get(t)('notificationTemplates.body'),
				}),
			],
			content: value,
			onUpdate: ({ editor: next }) => {
				value = next.getHTML();
			},
			onTransaction: () => {
				editorTick += 1;
			},
		});
		editor = instance;
		onReady?.({ insertPlaceholder });
		return () => {
			instance.destroy();
			if (editor === instance) {
				editor = null;
			}
		};
	}

	$effect(() => {
		editor?.setEditable(!disabled);
	});

	$effect(() => {
		const next = value;
		if (editor && editor.getHTML() !== next) {
			editor.commands.setContent(next || '', { emitUpdate: false });
		}
	});

	function toggleLink() {
		if (!editor) {
			return;
		}
		if (editor.isActive('link')) {
			editor.chain().focus().unsetLink().run();
			return;
		}
		const previous = (editor.getAttributes('link').href as string | undefined) ?? '';
		// Link href is a one-off URL prompt; a full link modal is out of scope for this T3 editor.
		// eslint-disable-next-line no-alert
		const href = window.prompt($t('notificationTemplates.linkPrompt'), previous);
		if (href === null) {
			return;
		}
		if (href.trim() === '') {
			editor.chain().focus().unsetLink().run();
			return;
		}
		editor.chain().focus().setLink({ href: href.trim() }).run();
	}
</script>

<div class="overflow-hidden rounded-xl border border-border bg-card" data-testid="notification-rich-text-editor">
	<div class="flex flex-wrap gap-1 border-b border-border bg-secondary/40 p-1">
		<Button
			type="button"
			size="sm"
			variant={boldActive ? 'secondary' : 'ghost'}
			class="h-8 w-8 rounded-lg p-0"
			disabled={disabled}
			aria-label={$t('notificationTemplates.toolbar.bold')}
			onclick={() => editor?.chain().focus().toggleBold().run()}
		>
			<Bold class="h-4 w-4" />
		</Button>
		<Button
			type="button"
			size="sm"
			variant={italicActive ? 'secondary' : 'ghost'}
			class="h-8 w-8 rounded-lg p-0"
			disabled={disabled}
			aria-label={$t('notificationTemplates.toolbar.italic')}
			onclick={() => editor?.chain().focus().toggleItalic().run()}
		>
			<Italic class="h-4 w-4" />
		</Button>
		<Button
			type="button"
			size="sm"
			variant={linkActive ? 'secondary' : 'ghost'}
			class="h-8 w-8 rounded-lg p-0"
			disabled={disabled}
			aria-label={$t('notificationTemplates.toolbar.link')}
			onclick={toggleLink}
		>
			<LinkIcon class="h-4 w-4" />
		</Button>
		<Button
			type="button"
			size="sm"
			variant={bulletActive ? 'secondary' : 'ghost'}
			class="h-8 w-8 rounded-lg p-0"
			disabled={disabled}
			aria-label={$t('notificationTemplates.toolbar.bulletList')}
			onclick={() => editor?.chain().focus().toggleBulletList().run()}
		>
			<List class="h-4 w-4" />
		</Button>
		<Button
			type="button"
			size="sm"
			variant={orderedActive ? 'secondary' : 'ghost'}
			class="h-8 w-8 rounded-lg p-0"
			disabled={disabled}
			aria-label={$t('notificationTemplates.toolbar.orderedList')}
			onclick={() => editor?.chain().focus().toggleOrderedList().run()}
		>
			<ListOrdered class="h-4 w-4" />
		</Button>
	</div>
	<div
		class={cn('notification-editor min-h-[10rem] text-sm', disabled && 'pointer-events-none opacity-60')}
		{@attach attachEditor}
		onfocusin={() => onFocus?.()}
	></div>
</div>

<style>
	.notification-editor :global(.tiptap) {
		min-height: 10rem;
		outline: none;
		padding: 0.75rem 1rem;
	}

	.notification-editor :global(.tiptap p) {
		margin: 0 0 0.5rem;
	}

	.notification-editor :global(.tiptap a) {
		color: hsl(var(--primary));
		text-decoration: underline;
	}

	.notification-editor :global(.tiptap ul) {
		list-style: disc;
		padding-left: 1.25rem;
	}

	.notification-editor :global(.tiptap ol) {
		list-style: decimal;
		padding-left: 1.25rem;
	}

	.notification-editor :global(.tiptap p.is-editor-empty:first-child::before) {
		color: hsl(var(--muted-foreground));
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
	}
</style>
