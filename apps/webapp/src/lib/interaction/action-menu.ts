/** A menu contains action rows, not capsule buttons. */
export function actionMenu(node: HTMLElement) {
	const allItems = () => Array.from(node.querySelectorAll<HTMLButtonElement>('button'));
	const items = () => allItems().filter(item => !item.disabled);
	function keydown(event: KeyboardEvent) {
		if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key))
			return;
		const options = items();
		if (!options.length)
			return;
		event.preventDefault();
		const index = options.indexOf(document.activeElement as HTMLButtonElement);
		const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : event.key === 'ArrowDown' ? (index + 1) % options.length : (index + options.length - 1) % options.length;
		options[next]?.focus();
	}
	const observer = new MutationObserver(() => {
		for (const item of allItems()) item.setAttribute('role', 'menuitem');
	});
	for (const item of allItems()) item.setAttribute('role', 'menuitem');
	observer.observe(node, { childList: true, subtree: true });
	node.addEventListener('keydown', keydown);
	queueMicrotask(() => items()[0]?.focus());
	return { destroy() {
		node.removeEventListener('keydown', keydown);
		observer.disconnect();
	} };
}
