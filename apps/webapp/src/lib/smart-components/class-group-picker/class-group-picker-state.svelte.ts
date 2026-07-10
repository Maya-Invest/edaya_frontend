import type { ClassNode } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';

export class ClassGroupPickerState {
	search = $state('');

	get classes(): ClassNode[] {
		return academicContext.classes;
	}

	filteredClasses(excludeIds: readonly string[] = [], levelFilter = 'all'): ClassNode[] {
		const needle = this.search.trim().toLowerCase();
		return this.classes
			.filter(classGroup => !excludeIds.includes(classGroup.id))
			.filter(classGroup => levelFilter === 'all' || classGroup.level === levelFilter)
			.filter((classGroup) => {
				if (!needle) {
					return true;
				}
				return classGroup.name.toLowerCase().includes(needle)
					|| classGroup.level.toLowerCase().includes(needle);
			})
			.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
	}

	classById(classGroupId: string): ClassNode | undefined {
		return this.classes.find(classGroup => classGroup.id === classGroupId);
	}

	reset() {
		this.search = '';
	}
}
