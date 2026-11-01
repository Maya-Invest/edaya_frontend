<script lang="ts">
	import { locale, t } from '$lib/i18n';
	import { messagePresentation, messageTimestamp } from '../message-presentation';

	const { message, destination }: {
		message: { authorKind: string; authorName: string; body: string; createdAt: string };
		destination: string;
	} = $props();
	const presentation = $derived(messagePresentation(destination, message.authorKind));
	const timestamp = $derived(messageTimestamp(message.createdAt, $locale));
	const author = $derived(message.authorKind === 'staff' ? `${$t('messages.schoolAuthor')} · ${message.authorName}` : message.authorName);
</script>

<article class="message-bubble space-y-2" class:outgoing={presentation.outgoing}
	data-direction={presentation.outgoing ? 'outgoing' : 'incoming'}
	aria-label={$t(presentation.labelKey, { author, timestamp })}>
	<h4 class="font-semibold">{author}</h4>
	<p class="whitespace-pre-wrap text-sm">{message.body}</p>
	<time class="block text-xs" datetime={message.createdAt}>{timestamp}</time>
</article>

<style>
	.message-bubble {
		width: fit-content;
		max-width: min(90%, 560px);
		padding: var(--space-lg);
		border-radius: var(--radius-surface);
		background: hsl(var(--muted));
		color: hsl(var(--card-foreground));
		overflow-wrap: anywhere;
	}
	.outgoing {
		margin-left: auto;
		background: hsl(var(--primary-container));
		color: hsl(var(--foreground));
	}
	@container (min-width: 600px) {
		.message-bubble { max-width: min(75%, 560px); }
	}
	@container (max-width: 20em) {
		.message-bubble { max-width: min(100%, 560px); }
	}
</style>
