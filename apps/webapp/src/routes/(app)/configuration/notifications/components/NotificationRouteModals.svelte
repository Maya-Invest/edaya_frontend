<script lang="ts">
	import type { NotificationTemplateKey } from '$lib/notification-templates/catalog';
	import { page } from '$app/stores';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { t } from '$lib/i18n';
	import { bindUrlModal } from '$lib/modal/modal-state.svelte';
	import { templateKeyFromPathname } from '$lib/notification-templates/catalog';
	import { get } from 'svelte/store';
	import { getNotificationModals } from '../notifications-modals.svelte';
	import { getNotificationsPageState } from '../notifications-page.svelte';
	import NotificationTemplateEditModal from './NotificationTemplateEditModal.svelte';

	const notificationsPage = getNotificationsPageState();
	const document = $derived(notificationsPage.document);

	const modals = getNotificationModals();

	$effect.pre(() => {
		void $page.url.search;
		modals.hydrate();
	});

	const editOpen = bindUrlModal(modals, 'edit');
	const resetAllOpen = bindUrlModal(modals, 'reset-all');
	const resetKeyOpen = bindUrlModal(modals, 'reset-key');

	let resetting = $state(false);

	const pathnameKey = $derived(templateKeyFromPathname($page.url.pathname));
	const activeKey = $derived.by((): NotificationTemplateKey | null => {
		if (modals.active !== 'edit' && modals.active !== 'reset-key') {
			return null;
		}
		return pathnameKey;
	});

	$effect(() => {
		if (!modals.ready) {
			return;
		}
		if (modals.active === 'reset-all' && (modals.target !== null || modals.tab !== null)) {
			modals.open('reset-all');
		}
	});

	async function confirmResetAll() {
		if (resetting || !document?.schoolId) {
			return;
		}

		resetting = true;
		try {
			const result = await notificationsPage.resetTemplates({
				successMessage: get(t)('notificationTemplates.toastResetAll'),
			});
			if (result) {
				resetAllOpen.open = false;
			}
		}
		finally {
			resetting = false;
		}
	}

	async function confirmResetKey() {
		const target = activeKey;
		if (resetting || !target || !document?.schoolId) {
			return;
		}

		resetting = true;
		try {
			const result = await notificationsPage.resetTemplates({
				templateKey: target,
				successMessage: get(t)('notificationTemplates.toastResetKey'),
			});
			if (result) {
				resetKeyOpen.open = false;
			}
		}
		finally {
			resetting = false;
		}
	}
</script>

<NotificationTemplateEditModal
	bind:open={editOpen.open}
	templateKey={pathnameKey}
/>

<ConfirmModal
	bind:open={resetAllOpen.open}
	title={$t('notificationTemplates.resetAll')}
	description={$t('notificationTemplates.resetAllConfirm')}
	confirmLabel={$t('notificationTemplates.resetAll')}
	cancelLabel={$t('common.cancel')}
	busy={resetting}
	onConfirm={confirmResetAll}
/>

<ConfirmModal
	bind:open={resetKeyOpen.open}
	title={activeKey ? $t(`notificationTemplates.keys.${activeKey}`) : ''}
	description={$t('notificationTemplates.resetKeyConfirm')}
	confirmLabel={$t('notificationTemplates.resetKey')}
	cancelLabel={$t('common.cancel')}
	busy={resetting}
	onConfirm={confirmResetKey}
/>
