import type { Page } from 'playwright';

export async function prepareHumanFixture(_page: Page, _base: string, group: string, entityId: string) {
  return { requestId: `fixture:${group}:${entityId}` };
}
