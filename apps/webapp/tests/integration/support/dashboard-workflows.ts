import assert from 'node:assert/strict';
import type { Page } from 'playwright';

const overviewPath = '**/core/queries/get-school-overview';
async function overview(page: Page, base: string) {
  const [response] = await Promise.all([
    // The first overview also waits for authenticated school/year bootstrap.
    page.waitForResponse(response => response.url().endsWith('/queries/get-school-overview') && response.request().method() === 'POST', { timeout: 30_000 }),
    page.goto(`${base}/dashboard`, {waitUntil:'domcontentloaded'}),
  ]);
  assert(response.ok(), `Dashboard overview HTTP ${response.status()}`);
  return await response.json();
}
export async function exerciseDashboard(page: Page, base: string, id: string): Promise<string> {
  const data = await overview(page, base);
  if (id === 'web.scenario.0011') {
    assert(data.kpis.studentCount > 0, 'Required dashboard student fixture missing');
    for (const [href,key] of [['/school/students','studentCount'],['/finance/billing','overdueFeeCount'],['/configuration/structure/details','unpublishedReportCardCount'],['/school/events','openIncidentCount']]) {
      const card = page.locator(`main a[href="${href}"]`).first();
      await card.waitFor();
      assert.equal(await card.locator('p').first().innerText(),String(data.kpis[key]),`Dashboard ${key} does not match API`);
    }
    return 'Compared displayed dashboard KPIs with the real school overview';
  }
  if (id === 'web.scenario.0012') {
    const links = page.locator('main a[href]').filter({has:page.locator('p')});
    await links.first().waitFor();
    const hrefs = [...new Set(await links.evaluateAll(nodes => nodes.map(node=>node.getAttribute('href')!)))];
    assert(hrefs.length >= 4, 'Required dashboard action cards missing');
    for(const href of hrefs) {
      await page.locator(`main a[href="${href}"]`).first().click();
      await page.waitForURL(url => url.pathname === new URL(href,base).pathname);
      await page.goto(`${base}/dashboard`,{waitUntil:'domcontentloaded'});
      await page.locator(`main a[href="${href}"]`).first().waitFor();
    }
    return 'Opened every distinct dashboard action-card destination';
  }
  // Deliberately fault the transport to exercise the renderer and retry, not authentication.
  await page.route(overviewPath, route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Integration transport unavailable'})}));
  try {
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('main [role="alert"]').waitFor();
    await page.unroute(overviewPath);
    const [restored] = await Promise.all([
      page.waitForResponse(response=>response.url().endsWith('/queries/get-school-overview') && response.ok()),
      page.locator('main [role="alert"]').getByRole('button').click(),
    ]);
    assert(restored.ok());
    await page.locator('main a[href="/school/students"]').first().waitFor();
    await page.route(overviewPath,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...data,actionItems:[],upcoming:[],classRiskRows:[]})}));
    await page.reload({waitUntil:'domcontentloaded'});
    for(const text of ['Rien à signaler pour le moment.','Aucun événement cette semaine.','Aucune classe configurée pour cette année.']) await page.locator('main').getByText(text,{exact:true}).waitFor();
    return 'Displayed an injected transport failure, recovered through retry, and rendered empty overview sections';
  } finally {await page.unroute(overviewPath); await page.reload({waitUntil:'domcontentloaded'});}
}
