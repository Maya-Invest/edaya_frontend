import { prepareHumanFixture } from './prepare-human';
import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { apiFetch } from '../setup/journey-api';
import { navigateSpaPage, waitForPageQuery } from '../../../scripts/qa-harness-ui';

export async function exerciseStudentList(page: Page, base: string, scenarioId: string): Promise<string | null> {
  if (!['web.scenario.0024', 'web.scenario.0025'].includes(scenarioId)) return null;
  const pagination = scenarioId === 'web.scenario.0025';
  const prefix = `IntegrationList${crypto.randomUUID().replaceAll('-', '')}`;
  const schoolId = await page.getByTestId('academic-year-trigger').getAttribute('data-school-id');
  assert(schoolId, 'Active school fixture missing');
  const ids: string[] = [];
  // Deliberately scramble creation order. These students have no enrollment and cannot alter grading rosters.
  const count = pagination ? 31 : 3;
  for (let index = count - 1; index >= 0; index--) {
    const id = crypto.randomUUID();
    const response = await apiFetch(page, base, '/core/commands/register-student', { method: 'POST', data: {
      ...await prepareHumanFixture(page, base, 'students', id), id, schoolId, firstName: 'Integration', lastName: `${prefix}${String(index).padStart(3, '0')}`, sendAccountInvitation: false,
    } });
    assert(response.ok(), `Student list fixture ${index}: HTTP ${response.status()}`);
    ids.unshift(id);
  }
  await navigateSpaPage(page, `${base}/school/students?view=table&q=${prefix}`);
  await waitForPageQuery(page);
  const rows = page.locator('main [data-entity-id]');
  await rows.first().waitFor();
  if (pagination) {
    const initial = await rows.count();
    assert(initial > 0 && initial < count, 'Pagination fixture must exceed the first visible window');
    await page.getByTestId('list-load-more-sentinel').scrollIntoViewIfNeeded();
    await page.waitForFunction(count => document.querySelectorAll('main [data-entity-id]').length === count, count);
    const actual = await rows.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-entity-id')));
    assert.equal(new Set(actual).size, count, 'Scrolled results must not duplicate students');
    assert.deepEqual([...actual].sort(), [...ids].sort(), 'Every isolated fixture must appear after scrolling');
    return 'Scrolled beyond the first result window and verified all fixture students exactly once';
  }
  const sort = page.getByTestId('list-sort').first();
  await sort.click();
  await page.waitForFunction(expected => JSON.stringify(Array.from(document.querySelectorAll('main [data-entity-id]'), node => node.getAttribute('data-entity-id'))) === JSON.stringify(expected), ids);
  await sort.click();
  await page.waitForFunction(expected => JSON.stringify(Array.from(document.querySelectorAll('main [data-entity-id]'), node => node.getAttribute('data-entity-id'))) === JSON.stringify(expected), [...ids].reverse());
  return 'Verified actual student row order in both ascending and descending directions';
}
