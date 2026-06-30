const TEMPLATE_VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

export function renderTemplatePreview(
	template: string,
	variables: Record<string, string>,
): string {
	return template.replace(TEMPLATE_VARIABLE_PATTERN, (match, key: string) => variables[key] ?? match);
}
