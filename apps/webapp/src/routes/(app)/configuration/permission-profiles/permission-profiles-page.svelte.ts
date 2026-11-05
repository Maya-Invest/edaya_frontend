import type { components } from '$lib/api/schema';
import type { StaffPermissionProfile } from '$lib/api/staff-permission-profiles-data';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { PermissionProfilesPageSlice } from './lib/permission-profiles-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { boundStaffCount } from '$lib/api/staff-permission-profiles-data';
import { authSession } from '$lib/auth/session.svelte';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import {
	readPermissionProfileListFilters,
	writePermissionProfileListFilters,
} from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { loadPermissionProfilesSlice, queryPermissionProfilesListPage } from './lib/permission-profiles-queries';
import { runPermissionProfilesRouteMutation } from './lib/permission-profiles-route-mutation';

const PROFILE_VERSION_FAMILIES = ['staff'] as const satisfies readonly EntityVersionKey[];

const PERMISSION_PROFILES_PAGE_STATE_KEY = Symbol('permission-profiles-page-state');

export type { PermissionProfilesPageSlice };

type ConfigurePermissionProfileCommand = components['schemas']['ConfigurePermissionProfileCommand'];

export class PermissionProfilesPageState {
	slice = $state<PermissionProfilesPageSlice | null>(null);

	readonly filters: ListFiltersState<{ q: string }>;

	private readonly versions = new RouteVersionSnapshot(PROFILE_VERSION_FAMILIES);

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writePermissionProfileListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readPermissionProfileListFilters(getUrl()),
		);
	}

	applySlice(data: PermissionProfilesPageSlice) {
		this.slice = data;
		this.versions.markLoaded();
	}

	clear() {
		this.slice = null;
	}

	get profiles() {
		return this.slice?.profiles ?? [];
	}

	get bindings() {
		return this.slice?.bindings ?? [];
	}

	get catalog() {
		return this.slice?.catalog ?? [];
	}

	boundCount(profileId: string) {
		return boundStaffCount(this.bindings, profileId);
	}

	upsertProfile(profile: StaffPermissionProfile) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			profiles: [profile, ...this.slice.profiles.filter(entry => entry.id !== profile.id)],
		};
	}

	removeProfile(id: string) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			profiles: this.slice.profiles.filter(entry => entry.id !== id),
			bindings: this.slice.bindings.filter(binding => binding.profileId !== id),
		};
	}

	queryListPage() {
		return queryPermissionProfilesListPage(this);
	}

	async refreshSlice() {
		const data = await loadPermissionProfilesSlice();
		this.applySlice(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}

	private schoolId(): string | null {
		return authSession.schoolId ?? academicContext.schools[0]?.id ?? null;
	}

  previewProfile(input: Omit<ConfigurePermissionProfileCommand, 'schoolId' | 'previewOnly'>) {
    return runMutation(() => getBrowserSchoolClient().commands.configurePermissionProfile({ ...input, schoolId: this.schoolId() ?? '', previewOnly: true }));
  }

	async saveProfile(input: {
		id?: string;
		name: string;
		shortName?: string;
		description?: string;
		permissions: ConfigurePermissionProfileCommand['permissions'];
		successMessage?: string;
	}): Promise<boolean> {
		const schoolId = this.schoolId();
		if (!schoolId) {
			return false;
		}

		const client = getBrowserSchoolClient();
		const id = input.id ?? crypto.randomUUID();
		const entity: StaffPermissionProfile = {
			id,
			schoolId,
			name: input.name.trim(),
			shortName: input.shortName,
			description: input.description?.trim() || undefined,
			permissions: input.permissions,
		};
		const previous = input.id ? this.profiles.find(entry => entry.id === input.id) : undefined;

		const result = await runPermissionProfilesRouteMutation({
			request: () => client.commands.configurePermissionProfile({
				id,
				schoolId,
				name: entity.name,
				shortName: entity.shortName,
				description: entity.description ?? null,
				permissions: entity.permissions,
			}),
			successMessage: input.successMessage,
			apply: () => this.upsertProfile(entity),
			rollback: () => {
				if (previous) {
					this.upsertProfile(previous);
				}
				else {
					this.removeProfile(id);
				}
			},
			onSuccess: (saved) => {
				this.upsertProfile(saved);
			},
		});
		return result !== null;
	}

	async deleteProfile(input: {
		profileId: string;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const previous = this.profiles.find(entry => entry.id === input.profileId);
		const previousBindings = this.bindings.filter(binding => binding.profileId === input.profileId);

		const result = await runPermissionProfilesRouteMutation({
			request: () => client.entities.staffPermissionProfiles.delete({ id: input.profileId }),
			successMessage: input.successMessage,
			apply: () => this.removeProfile(input.profileId),
			rollback: () => {
				if (previous && this.slice) {
					this.slice = {
						...this.slice,
						profiles: [previous, ...this.slice.profiles.filter(entry => entry.id !== previous.id)],
						bindings: [...previousBindings, ...this.slice.bindings.filter(binding => binding.profileId !== previous.id)],
					};
				}
			},
		});
		return result !== null;
	}
}

export function setPermissionProfilesPageState(state: PermissionProfilesPageState) {
	setContext(PERMISSION_PROFILES_PAGE_STATE_KEY, state);
}

export function getPermissionProfilesPageState() {
	return getContext<PermissionProfilesPageState>(PERMISSION_PROFILES_PAGE_STATE_KEY);
}
