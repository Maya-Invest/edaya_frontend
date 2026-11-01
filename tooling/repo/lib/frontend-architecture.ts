import path from 'node:path'
import ts from 'typescript'
import retiredModules from './retired-frontend-modules.json'

const withoutExtension = (name: string) => name.replace(/\.(?:svelte(?:\.ts)?|[cm]?[jt]sx?)$/, '')
const retired = new Set(retiredModules.map(withoutExtension))

export interface ArchitectureIssue { file: string, message: string }

function canonicalModule(file: string, specifier: string): string {
  if (specifier === '$lib' || specifier.startsWith('$lib/')) {
    const app = file.match(/^apps\/[^/]+/)?.[0]
    return `${app}/src/lib/${specifier === '$lib' ? 'index' : specifier.slice(5)}`
  }
  return specifier.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier)) : specifier
}

/** Parse imports, exports and literal dynamic imports; comments and import types are harmless. */
export function checkFrontendImports(file: string, source: string): ArchitectureIssue[] {
  const blocks = file.endsWith('.svelte')
    ? [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]!)
    : [source]
  const issues: ArchitectureIssue[] = []
  for (const block of blocks) {
    const ast = ts.createSourceFile(file, block, ts.ScriptTarget.Latest, true)
    function check(specifier: string, runtime: boolean, names?: string[]) {
      const module = withoutExtension(canonicalModule(file, specifier))
      if (retired.has(module)) {
        issues.push({ file, message: `Retired module import: ${specifier}` })
      }
      if (!file.endsWith('.svelte') || !runtime)
        return
      const client = /\/auth\/client$/.test(module)
        || /\/(?:api|queries)\/(?:[\w-]*client|mutations\/)/.test(module)
        || (specifier === '@maya-invest/edaya-api-client' && (!names?.length || names.some(name => name !== 'ApiError')))
      const routeWrites = /(?:mutations?|mutation-runner)$/.test(module)
        && (!names?.length || names.some(name => /Mutation$|OnPage$|^run.*Mutation$/.test(name)))
      if (client || routeWrites) {
        issues.push({ file, message: `Presentation imports runtime I/O: ${specifier}; use owner state or a typed callback` })
      }
    }
    function visit(node: ts.Node) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const clause = node.importClause
        const bindings = clause?.namedBindings
        const names = bindings && ts.isNamedImports(bindings)
          ? [...(clause?.name ? ['default'] : []), ...bindings.elements.filter(entry => !entry.isTypeOnly).map(entry => (entry.propertyName ?? entry.name).text)]
          : undefined
        const runtime = !clause || (!clause.isTypeOnly && (!!clause.name || !bindings || ts.isNamespaceImport(bindings) || bindings.elements.length === 0 || !!names?.length))
        check(node.moduleSpecifier.text, runtime, names)
      }
      else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const names = node.exportClause && ts.isNamedExports(node.exportClause)
          ? node.exportClause.elements.filter(entry => !entry.isTypeOnly).map(entry => (entry.propertyName ?? entry.name).text)
          : undefined
        check(node.moduleSpecifier.text, !node.isTypeOnly && (!names || names.length > 0 || !!(node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.length === 0)), names)
      }
      else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
        check(node.arguments[0].text, true)
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
  }
  return issues
}

export function checkWorkspaceReferences(file: string, source: string, workspaceNames: ReadonlySet<string>): ArchitectureIssue[] {
  const issues: ArchitectureIssue[] = []
  // Match Bun/Turbo filters and reusable workflow package inputs, not dependency names.
  for (const match of source.matchAll(/(?:--filter(?:=|\s+)|\bpackage:\s*)["']?(@edaya\/[\w-]+)/g)) {
    if (!workspaceNames.has(match[1]!))
      issues.push({ file, message: `Unknown workspace application: ${match[1]}` })
  }
  return issues
}
