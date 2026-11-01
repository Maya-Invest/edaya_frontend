import { browser } from '$app/environment';
import { readPreference, writePreference } from '$lib/preferences/storage';

const STORAGE_KEY = 'edaya:sidebarOpen';

class ShellContext {
  sidebarOpen = $state(true);

  constructor() {
    if (browser) {
      const stored = readPreference('local', STORAGE_KEY);
      if (stored !== null) {
        this.sidebarOpen = stored === 'true';
      }
    }
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    if (browser) {
      writePreference('local', STORAGE_KEY, String(this.sidebarOpen));
    }
  }
}

export const shellContext = new ShellContext();
