import type { DrawerItem } from '$lib/components/school/shared/drawer-types';

export class DrawerState {
	item = $state<DrawerItem>(null);

	open(item: DrawerItem) {
		this.item = item;
	}

	close() {
		this.item = null;
	}

	get selectedId(): string | undefined {
		const d = this.item;
		if (!d)
return undefined;
		if (d.kind === 'staffPermissions')
			return d.data.id;
		if (d.kind === 'level')
return d.data.label;
		return d.data.id;
	}
}
