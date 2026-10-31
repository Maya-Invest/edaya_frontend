// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			studentGuardianOrigin?: import('./routes/(app)/school/students/lib/student-guardian-navigation').StudentGuardianOrigin;
			studentGuardianReturn?: import('./routes/(app)/school/students/lib/student-guardian-navigation').StudentGuardianOrigin;
			/** Non-authoritative parent URL used for history-aware drawer/modal close behavior. */
			routeSurfaceParent?: string;
			/** Number of history entries in the current routed overlay/workflow. */
			routeSurfaceDepth?: number;
		}
		// interface Platform {}
	}
}

export {};
