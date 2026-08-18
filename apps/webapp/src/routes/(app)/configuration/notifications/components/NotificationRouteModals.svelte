<script lang="ts">
	import type { NotificationTemplateKey } from '$lib/notification-templates/catalog';
	import { page } from '$app/stores';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { t } from '$lib/i18n';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { NOTIFICATION_TEMPLATE_KEYS } from '$lib/notification-templates/catalog';
	import { get } from 'svelte/store';
	import { setNotificationModals } from '../notifications-modals.svelte';
	import { getNotificationsPageState } from '../notifications-page.svelte';
	import NotificationTemplateEditModal from './NotificationTemplateEditModal.svelte';

	const notificationsPage = getNotificationsPageState();
	const document = $derived(notificationsPage.document);

	const modals = createUrlSyncedModals({
		allowed: ['edit', 'reset-all'],
		allowedTabs: ['reset-key'],
		getUrl: () => $page.url,
	});
	setNotificationModals(modals);

	$effect.pre(() => {
		void $page.url.search;
		modals.hydrate();
	});

	const editOpen = bindUrlModal(modals, 'edit');
	const resetAllOpen = bindUrlModal(modals, 'reset-all');

	let resetting = $state(false);

	function isTemplateKey(value: string | null): value is NotificationTemplateKey {
		return value !== null && NOTIFICATION_TEMPLATE_KEYS.includes(value as NotificationTemplateKey);
	}

	const editKey = $derived.by((): NotificationTemplateKey | null => {
		if (modals.active !== 'edit') {
			return null;
		}
		if (isTemplateKey(modals.target)) {
			return modals.target;
		}
		const urlTarget = $page.url.searchParams.get('modalTarget');
		if (urlTarget && isTemplateKey(urlTarget)) {
			return urlTarget;
		}
		return NOTIFICATION_TEMPLATE_KEYS[0] ?? null;
	});

	const resetKeyConfirmOpen = $derived(
		editKey !== null && modals.active === 'edit' && modals.tab === 'reset-key',
	);

	$effect(() => {
		if (!modals.ready) {
			return;
		}
		if (modals.active === 'reset-all') {
			if (modals.target !== null || modals.tab !== null) {
				modals.open('reset-all');
			}
			return;
		}
		if (modals.active !== 'edit') {
			return;
		}
		if (isTemplateKey(modals.target)) {
			return;
		}
		const urlTarget = $page.url.searchParams.get('modalTarget');
		if (urlTarget && isTemplateKey(urlTarget)) {
			modals.open('edit', { target: urlTarget });
			return;
		}
		if (!urlTarget) {
			modals.open('edit', { target: NOTIFICATION_TEMPLATE_KEYS[0] });
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
		const target = editKey;
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
				modals.close();
			}
		}
		finally {
			resetting = false;
		}
	}
</script>

<NotificationTemplateEditModal
	bind:open={editOpen.open}
	templateKey={editKey}
	onReset={() => modals.setTab('reset-key')}
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
	open={resetKeyConfirmOpen}
	title={editKey ? $t(`notificationTemplates.keys.${editKey}`) : ''}
	description={$t('notificationTemplates.resetKeyConfirm')}
	confirmLabel={$t('notificationTemplates.resetKey')}
	cancelLabel={$t('common.cancel')}
	busy={resetting}
	onOpenChange={(open) => {
		if (!open && modals.active === 'edit') {
			modals.setTab(null);
		}
	}}
	onConfirm={confirmResetKey}
/>
