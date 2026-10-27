/** A local, ephemeral comparison; never stores secrets or file bytes. */
export function formValues(form: HTMLFormElement): string {
	return JSON.stringify(Array.from(form.querySelectorAll('input, textarea, select')).map((field) => {
		if (field instanceof HTMLInputElement) {
			if (field.type === 'checkbox' || field.type === 'radio')
				return field.checked;
			if (field.type === 'file')
				return Array.from(field.files ?? []).map(file => [file.name, file.size, file.lastModified]);
		}
		return (field as HTMLInputElement).value;
	}));
}

/** Validation proxies preserve native validity while focus belongs to the custom control. */
export function focusInvalidField(form: HTMLFormElement): HTMLElement | null {
	const invalid = form.querySelector<HTMLElement>(':invalid');
	if (!invalid)
		return null;
	const target = invalid.matches('[data-select-value]')
		? invalid.closest('[data-select-field]')?.querySelector<HTMLElement>('[aria-haspopup="listbox"]') ?? invalid
		: invalid;
	target.setAttribute('aria-invalid', 'true');
	target.focus();
	return target;
}
