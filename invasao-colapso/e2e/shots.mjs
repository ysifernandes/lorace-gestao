import { chromium } from 'playwright';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.locator('.menu-item', { hasText: 'Jogar local' }).click();
await page.waitForSelector('.setup');
await page.locator('.chooser .chip').nth(1).click();
await page.locator('.setup__block-head .btn').click();
await page.locator('.setup__footer .btn--primary').click();
await page.waitForSelector('.match');
await page.locator('.board__controls button').nth(2).click();
await page.waitForTimeout(200);
await page.screenshot({ path: '/tmp/shot-mundo.png' });
for (const [i, name] of [[1, 'regiao'], [2, 'territorio']]) {
  await page.locator('.board__camera-btn').nth(i).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `/tmp/shot-${name}.png` });
}
await browser.close();
