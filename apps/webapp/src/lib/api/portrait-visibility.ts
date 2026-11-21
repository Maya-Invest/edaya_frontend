const targets = new Map<Element, (visible: boolean) => void>();
let observer: IntersectionObserver | undefined;

/** Notify every avatar intersecting this viewport in the same observer callback. */
export function observePortrait(target: Element, update: (visible: boolean) => void) {
	if (typeof IntersectionObserver === 'undefined') {
		update(true);
		return () => {};
	}
	observer ??= new IntersectionObserver((entries) => {
		for (const entry of entries) targets.get(entry.target)?.(entry.isIntersecting);
	});
	targets.set(target, update);
	observer.observe(target);
	return () => {
		targets.delete(target);
		observer?.unobserve(target);
		if (!targets.size) {
			observer?.disconnect();
			observer = undefined;
		}
	};
}
