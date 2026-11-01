import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { openDialogButton, searchAndSelectPerson, waitForDialogClosed } from '../../../scripts/qa-harness-ui';

/** Exercise harness boundaries that otherwise turn successful writes into fixture failures. */
export async function verifyHarnessDialogBoundaries(page: Page): Promise<void> {
  await page.setContent('<div role="dialog" class="ui-drawer">Inspection</div><div role="dialog" data-testid="form-modal">Mutation</div>');
  assert.equal(await waitForDialogClosed(page, 100), false, 'An open mutation must not count as closed');
  await page.getByTestId('form-modal').evaluate(element => element.remove());
  assert.equal(await waitForDialogClosed(page, 100), true, 'Inspection remains open after a mutation closes');
  assert.equal(await page.locator('.ui-drawer').isVisible(), true);

  await page.setContent(`<div id="pending"></div><script>
    setTimeout(() => {
      document.getElementById('pending').innerHTML = '<button data-testid="collection-menu">Actions</button><button id="add" hidden>Add class</button><div role="dialog" hidden>Create class</div>';
      document.querySelector('[data-testid="collection-menu"]').onclick = () => document.getElementById('add').hidden = false;
      document.getElementById('add').onclick = () => document.querySelector('[role="dialog"]').hidden = false;
    }, 200);
  </script>`);
  assert.equal(await openDialogButton(page, /Add class/, 2000), true, 'Wait for the menu to mount before opening its action');
  await page.setContent(`<div role="dialog"><button data-testid="person-picker-trigger">Student</button></div><script>
    document.querySelector('button').onclick = () => {
      document.body.insertAdjacentHTML('beforeend', '<div data-person-picker-search><input aria-label="Search"></div><ul role="listbox"></ul>');
      setTimeout(() => {
        document.querySelector('ul').innerHTML = '<li><button role="option">Required student</button></li>';
        document.querySelector('[role="option"]').onclick = () => document.body.dataset.selected = 'required';
      }, 250);
    };
  </script>`);
  assert.equal(await searchAndSelectPerson(page, 'Required student'), true, 'Named fixtures must wait for the directory response');
  assert.equal(await page.locator('body').getAttribute('data-selected'), 'required');
  await page.setContent('');
}
