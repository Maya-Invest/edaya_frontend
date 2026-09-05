import { plugin } from 'bun';
import { compileModule } from 'svelte/compiler';

/**
 * Bun test treats `.svelte.ts` as plain TypeScript on Linux CI, so `$state` is
 * an undefined identifier. Compile runes the same way Vite does.
 */
plugin({
	name: 'svelte-module-loader',
	setup(build) {
		build.onLoad({ filter: /\.svelte\.(ts|js)$/ }, async (args) => {
			const source = await Bun.file(args.path).text();
			const result = compileModule(source, {
				filename: args.path,
				generate: 'client',
				dev: true,
			});
			return {
				contents: result.js.code,
				loader: 'js',
			};
		});
	},
});
