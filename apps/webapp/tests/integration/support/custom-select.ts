import type { Locator, Page } from 'playwright';

/** Locate the visible select-only control, never its hidden form proxy. */
export function selectControl(scope: Page | Locator, options?: { name?: string | RegExp; exact?: boolean }): Locator {
  return options ? scope.getByRole('button', options).and(scope.locator('[aria-haspopup="listbox"]')) : scope.locator('button[aria-haspopup="listbox"]');
}

/** Read option IDs from the form adapter, while performing selection through the UI. */
export function selectOptions(control: Locator): Locator {
  return control.locator('xpath=ancestor-or-self::*[@data-select-field][1]').locator('select[data-select-value] option');
}

export async function chooseOption(control: Locator, choice: string | { value?: string; label?: string; index?: number }): Promise<void> {
  const field = control.locator('xpath=ancestor-or-self::*[@data-select-field][1]');
  const trigger = field.locator('button[aria-haspopup="listbox"]');
  await trigger.waitFor({ state: 'visible' });
  let options: Array<{ value: string; label: string; disabled: boolean }> = [];
  let match: typeof options[number] | undefined;
  const deadline = Date.now() + 15000;
  do {
    options = await field.locator('select[data-select-value] option').evaluateAll(nodes => nodes.map(node => {
      const option = node as HTMLOptionElement;
      return { value: option.value, label: option.text, disabled: option.disabled || (option.parentElement instanceof HTMLOptGroupElement && option.parentElement.disabled) };
    }));
    match = typeof choice === 'string' ? options.find(option => option.value === choice)
      : choice.index !== undefined ? options[choice.index]
      : options.find(option => choice.value !== undefined ? option.value === choice.value : option.label === choice.label);
    if (match) break;
    await control.page().waitForTimeout(100);
  } while (Date.now() < deadline);
  if (!match) throw new Error(`Select option unavailable: ${JSON.stringify(choice)}`);
  if (match.disabled) throw new Error(`Select option disabled: ${match.label}`);
  await trigger.click();
  // Select portals its popup. Require a single visible listbox, including inside filter/modal popovers.
  const popup = control.page().getByRole('listbox').and(control.page().locator('[data-state="open"]')).filter({ visible: true });
  await popup.waitFor();
  const occurrence = options.slice(0, options.indexOf(match)).filter(option => option.label === match.label).length;
  await popup.getByRole('option', { name: match.label, exact: true }).nth(occurrence).click();
}

/** Visible trigger for a control or its hidden serialization proxy. */
export function selectTrigger(control: Locator): Locator {
  return control.locator('xpath=ancestor-or-self::*[@data-select-field][1]').locator('button[aria-haspopup="listbox"]');
}
