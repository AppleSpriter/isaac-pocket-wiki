// Optional browser regression check. Install Playwright or set ISAAC_PLAYWRIGHT_MODULE.
const { chromium } = require(process.env.ISAAC_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.ISAAC_PREVIEW_URL || 'http://127.0.0.1:8765/';
const output = path.join(__dirname, '../output/ui');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.ISAAC_BROWSER_EXECUTABLE ? { executablePath: process.env.ISAAC_BROWSER_EXECUTABLE } : {}) });
  let page;
  const errors = [];
  try {
    page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const navigate = async view => {
      if (['favorites', 'recent', 'settings', 'about'].includes(view)) {
        await page.locator('#bottom-nav [data-view="mine"]').click();
        await page.locator(`#mine-tabs [data-mine-view="${view}"]`).click();
      } else await page.locator(`#bottom-nav [data-view="${view}"]`).click();
    };
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    assert.equal(await page.locator('#categories .active').getAttribute('data-category'), 'all');
    assert.equal(await page.locator('.item-card').count(), 48);
    await page.screenshot({ path: path.join(output, 'catalog-mobile.png') });

    await page.locator('#search').fill('C600');
    assert.equal(await page.locator('.item-card').count(), 1);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('isaac.catalog.v2')).positions.all.key), 'C600');
    await page.locator('#clear-search').click();
    await page.locator('[data-item-key="C600"].located').waitFor();
    assert.ok(Number(await page.locator('#page-number').inputValue()) > 10);
    assert.equal(await page.locator('.item-card').count(), 48);
    await page.screenshot({ path: path.join(output, 'located-c600.png') });

    await page.locator('#search').fill('C601');
    await page.locator('#list [data-key="C601"]').click();
    await page.locator('#back').waitFor();
    await page.locator('#back').click();
    await page.locator('[data-item-key="C601"].located').waitFor();
    assert.equal(await page.locator('#search').inputValue(), '');

    await page.locator('[data-category="active"]').click();
    for (const view of ['quiz', 'about', 'favorites', 'recent', 'catalog']) await navigate(view);
    assert.equal(await page.locator('#categories .active').getAttribute('data-category'), 'active');
    await page.locator('#search').fill('C357');
    await page.locator('#clear-search').click();
    await page.locator('[data-item-key="C357"]').waitFor();
    await page.reload();
    await page.locator('[data-item-key="C357"]').waitFor();
    assert.equal(await page.locator('#categories .active').getAttribute('data-category'), 'active');

    await page.locator('#overview-open').click();
    assert.equal(await page.locator('.overview-item').count(), 170);
    await page.locator('#overview-scale').evaluate(el => { el.value = '150'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(await page.locator('#overview-percent').textContent(), '150%');
    await page.locator('[data-locate-key="C33"]').click();
    await page.locator('[data-item-key="C33"].located').waitFor();
    assert.equal(await page.locator('#overview-dialog').evaluate(el => el.open), false);

    await page.locator('[data-category="all"]').click();
    await page.locator('#overview-open').click();
    assert.equal(await page.locator('.overview-item').count(), 1022);
    const box = await page.locator('.overview-viewport').boundingBox();
    const before = Number(await page.locator('#overview-scale').inputValue());
    const session = await page.context().newCDPSession(page);
    const y = box.y + 90;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 130, y }, { x: 240, y }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 70, y }, { x: 305, y }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.ok(Number(await page.locator('#overview-scale').inputValue()) > before, 'pinch must enlarge the overview');
    assert.equal(await page.locator('#overview-dialog').evaluate(el => el.open), true);
    await page.locator('#overview-scale').evaluate(el => { el.value = '90'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.screenshot({ path: path.join(output, 'overview-mobile.png') });
    await page.locator('[data-locate-key="C600"]').click();
    await page.locator('[data-item-key="C600"].located').waitFor();

    await page.locator('#overview-open').click();
    assert.equal(await page.evaluate(() => window.handleAppBack()), true);
    assert.equal(await page.locator('#overview-dialog').evaluate(el => el.open), false);
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'horizontal overflow at '+width);
    }

    const direct = await browser.newPage({ viewport: { width: 390, height: 844 } });
    direct.on('pageerror', e => errors.push(e.message));
    await direct.goto(base + '#C600');
    await direct.locator('#back').click();
    await direct.locator('[data-item-key="C600"].located').waitFor();
    assert.equal(await direct.evaluate(() => location.hash), '');
    await direct.close();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-category="active"]').click();
    await navigate('about');
    await page.evaluate(() => { location.hash = 'C600'; });
    await page.locator('#back').click();
    await page.locator('[data-item-key="C600"].located').waitFor();
    assert.equal(await page.locator('#categories .active').getAttribute('data-category'), 'passive');
    await page.reload();
    await page.waitForFunction(() => {
      const card = document.querySelector('[data-item-key="C600"]');
      return card && card.getBoundingClientRect().top >= 0 && card.getBoundingClientRect().top < innerHeight - 100;
    });

    await page.locator('[data-category="all"]').click();
    await page.locator('#search').fill('C105');
    await page.locator('#list [data-key="C105"]').click();
    await page.locator('#detail .achievement-links [data-key="A29"]').waitFor();
    assert.ok(await page.locator('.wiki-section').count() > 3, 'item must include full Wiki sections');
    await page.getByRole('button', { name: '轶事', exact: true }).click();
    const trivia = page.locator('.wiki-section').filter({ has: page.locator('summary').filter({ hasText: /^轶事$/ }) });
    assert.equal(await trivia.getAttribute('open'), '');
    const localLink = trivia.locator('a[href="#C96"]');
    await localLink.scrollIntoViewIfNeeded();
    const readingPosition = await page.evaluate(() => scrollY);
    await localLink.click();
    await page.waitForURL('**/#C96');
    await page.locator('#back').click();
    await page.waitForURL('**/#C105');
    await page.waitForFunction(y => Math.abs(scrollY - y) < 5, readingPosition);
    assert.equal(await trivia.getAttribute('open'), '', 'Back must restore expanded chapters');
    await page.screenshot({ path: path.join(output, 'wiki-trivia-mobile.png') });

    await page.locator('#detail .achievement-links [data-key="A29"]').click();
    await page.waitForURL('**/#A29');
    assert.ok((await page.locator('#detail').innerText()).includes('达成条件'));
    await page.locator('#detail [data-key="C105"]').click();
    await page.waitForURL('**/#C105');
    await page.locator('#back').click();
    await page.waitForURL('**/#A29');
    await page.locator('#back').click();
    await page.waitForURL('**/#C105');
    await page.locator('#back').click();
    await page.locator('[data-item-key="C105"].located').waitFor();

    await page.locator('#bottom-nav [data-view="achievements"]').click();
    assert.equal(await page.locator('#achievement-count').textContent(), '641 项');
    assert.equal(await page.locator('.achievement-card').count(), 48);
    await page.locator('#achievement-search').fill('A29');
    assert.equal(await page.locator('.achievement-card').count(), 1);
    await page.locator('#achievement-search').fill('The D6');
    await page.locator('#achievement-list [data-key="A29"]').waitFor();
    await page.locator('#achievement-search').fill('A641');
    assert.equal(await page.locator('.achievement-card').count(), 1);
    await page.locator('#achievement-list [data-key="A641"]').click();
    await page.waitForURL('**/#A641');
    await page.locator('#back').click();
    await page.locator('#achievement-list [data-key="A641"]').waitFor();
    assert.equal(await page.locator('#achievement-search').inputValue(), 'A641');
    await page.locator('#achievement-clear').click();
    await page.locator('#achievement-next').click();
    assert.equal(await page.locator('#achievement-page').inputValue(), '2');
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'achievement overflow at '+width);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'achievements-mobile.png') });
    const achievementDirect = await browser.newPage({ viewport: { width: 320, height: 844 } });
    achievementDirect.on('pageerror', e => errors.push(e.message));
    await achievementDirect.goto(base + '#A641');
    await achievementDirect.locator('#back').click();
    await achievementDirect.locator('[data-achievement-key="A641"].located').waitFor();
    assert.equal(await achievementDirect.locator('#achievement-page').inputValue(), '14');
    await achievementDirect.close();
    await navigate('settings');
    assert.equal(await page.locator('#bottom-nav button').count(), 4);
    await page.locator('#expand-wiki-default').check();
    await page.reload();
    await navigate('settings');
    assert.equal(await page.locator('#expand-wiki-default').isChecked(), true);
    await navigate('catalog');
    await page.locator('[data-category="all"]').click();
    await page.locator('#search').fill('C105');
    await page.locator('#list [data-key="C105"]').click();
    await page.locator('#wiki-toggle-all').waitFor();
    assert.equal(await page.locator('.wiki-section[open]').count(), await page.locator('.wiki-section').count());
    await page.locator('#wiki-toggle-all').click();
    assert.equal(await page.locator('.wiki-section[open]').count(), 0);
    await page.locator('#back').click();
    await navigate('settings');
    await page.locator('#expand-wiki-default').uncheck();
    assert.deepEqual(errors, []);
    console.log('UI passed: catalog location and persistence, overview, full Wiki chapters and reading restoration, item/achievement links, achievement search/pagination/deep links, narrow layouts.');
  } catch (error) {
    if (page && !page.isClosed()) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
