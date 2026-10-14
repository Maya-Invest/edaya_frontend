import { get, writable } from 'svelte/store';
export const page = writable({ url: new URL('http://localhost/configuration/grade-scales'), state: {} });
export async function appGoto(href: string) { page.set({ url: new URL(href, get(page).url), state: {} }); }
export function appPath(path: string) { return path.replace('/(app)', '').replace('/[[id]]', ''); }
export const openRouteSurface = appGoto;
export const closeRouteSurface = appGoto;
export const navigateWithinRouteSurface = appGoto;
export const replaceRouteSurface = appGoto;
export const closeDetailDrawer = appGoto;
export const listSurfaceHref = (path: string) => path;
