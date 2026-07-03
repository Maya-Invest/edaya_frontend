import { browser } from '$app/environment';

const STORAGE_KEY = 'edaya:sidebarOpen';

class ShellContext {
	sidebarOpen = $state(true);

	constructor() {
		if (browser) {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored !== null) {
				this.sidebarOpen = stored === 'true';
			}
		}
	}

	toggleSidebar() {
		this.sidebarOpen = !this.sidebarOpen;
		if (browser) {
			localStorage.setItem(STORAGE_KEY, String(this.sidebarOpen));
		}
	}
}

export const shellContext = new ShellContext();
