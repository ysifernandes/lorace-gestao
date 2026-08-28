import { chromium } from 'playwright';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: CHROME });
for (let i = 0; i < 12; i += 1) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.home__actions .btn--primary').click();
  await page.waitForSelector('.setup');
  await page.locator('.chooser .chip').nth(1).click();
  await page.locator('.setup__block-head .btn').click();
  await page.locator('.setup__footer .btn--primary').click();
  await page.waitForSelector('.match');
  await page.waitForTimeout(200);
  const victory = await page.locator('.victory').count();
  if (victory) {
    console.log(`run ${i}: VITÓRIA IMEDIATA →`, (await page.locator('.victory').innerText()).replace(/\n+/g, ' | '));
    const log = await page.locator('.log__item').allInnerTexts();
    console.log('  log:', log.slice(0, 6).join(' // '));
  } else {
    console.log(`run ${i}: ok`);
  }
  await ctx.close();
}
await browser.close();
