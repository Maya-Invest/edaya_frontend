import { readFileSync } from 'node:fs';
import { posix, resolve, win32 } from 'node:path';
import { expect, test } from 'bun:test';
import ts from 'typescript';
import { FOCUSED_BROWSER_SUITES } from '../../../../tooling/repo/ops/browser-suites';

for (const suite of FOCUSED_BROWSER_SUITES) {
	test(`${suite.name} screenshots do not depend on host-specific absolute paths`, () => {
		const path = resolve(import.meta.dirname, '../integration', suite.script);
		const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
		const absolutePaths: string[] = [];
		function visit(node: ts.Node): void {
			if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'screenshot') {
				const options = node.arguments[0];
				if (options && ts.isObjectLiteralExpression(options)) {
					for (const property of options.properties) {
						if (ts.isPropertyAssignment(property) && property.name.getText(source) === 'path' ) {
							const value = property.initializer;
							const path = ts.isStringLiteralLike(value) ? value.text : ts.isTemplateExpression(value) ? value.head.text : '';
							if (posix.isAbsolute(path) || win32.isAbsolute(path)) absolutePaths.push(path);
						}
					}
				}
			}
			ts.forEachChild(node, visit);
		}
		visit(source);
		expect(absolutePaths).toEqual([]);
	});
}
