import { plugin } from 'bun';
import { expect, test } from 'bun:test';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import { navItems } from './lib/config/navigation';

plugin({ name: 'placeholder-server-rendering', setup(build) {
	build.onLoad({ filter: /\.svelte$/ }, async ({ path }) => ({
		contents: compile(await Bun.file(path).text(), { filename: path, generate: 'server' }).js.code,
		loader: 'js',
	}));
} });

for (const item of navItems) {
	test(`placeholder ${item.href} renders its heading without claiming connected forms`, async () => {
		const route = item.href === '/' ? '' : item.href;
		const component = await import(`./routes${route}/+page.svelte`);
		const { body } = render(component.default);
		expect(body).toContain(item.label);
		expect(body).toMatch(/<h2\b/);
		expect(body).not.toMatch(/<(?:form|input)\b/);
	});
}
