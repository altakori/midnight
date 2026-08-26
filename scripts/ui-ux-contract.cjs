const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.MIDNIGHT_URL || 'http://localhost:5174';
const OUT = path.join('qa-art', 'ui-ux-contract');
const SAVE_KEY = 'midnight-frequency-v10';
fs.mkdirSync(OUT, { recursive: true });

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

async function layout(page, criticalSelectors = []) {
  return page.evaluate((selectors) => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const critical = selectors.flatMap((selector) => [...document.querySelectorAll(selector)]).filter(visible).map((el) => {
      const r = el.getBoundingClientRect();
      return {
        selector: selectors.find((selector) => el.matches(selector)),
        text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 80),
        x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height),
        fontSize: Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10,
        inside: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
      };
    });
    const viewport = document.querySelector('.viewport')?.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sceneRatio: viewport ? Math.round((viewport.width * viewport.height) / (innerWidth * innerHeight) * 1000) / 1000 : 0,
      critical,
      title: document.querySelector('.place h2')?.textContent?.trim() || '',
      objective: document.querySelector('.header-objective strong')?.textContent?.trim() || '',
    };
  }, criticalSelectors);
}

async function requireLayout(name, data, minSceneRatio) {
  invariant(data.horizontalOverflow <= 1, `${name}: horizontal overflow ${data.horizontalOverflow}px`);
  invariant(data.sceneRatio >= minSceneRatio, `${name}: scene occupies only ${data.sceneRatio}`);
  invariant(data.objective.length > 3, `${name}: current objective missing`);
  const outside = data.critical.filter((item) => !item.inside);
  invariant(outside.length === 0, `${name}: critical controls outside viewport: ${JSON.stringify(outside)}`);
}

async function requireFocusWrap(page, dialogSelector, label) {
  const focusables = page.locator(`${dialogSelector} button, ${dialogSelector} [href], ${dialogSelector} [tabindex]:not([tabindex="-1"])`);
  const count = await focusables.count();
  invariant(count > 0, `${label}: modal has no focusable controls`);
  await focusables.first().focus();
  await page.keyboard.press('Shift+Tab');
  invariant(await focusables.last().evaluate((el) => document.activeElement === el), `${label}: reverse focus did not wrap first→last`);
  await focusables.last().focus();
  await page.keyboard.press('Tab');
  invariant(await focusables.first().evaluate((el) => document.activeElement === el), `${label}: forward focus did not wrap last→first`);
}

(async () => {
  const report = { base: BASE, startedAt: new Date().toISOString(), checks: {}, consoleErrors: [], pageErrors: [], badResponses: [] };
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => report.pageErrors.push(error.message));
    page.on('response', (response) => { if (response.status() >= 400) report.badResponses.push({ status: response.status(), url: response.url() }); });

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.locator('[data-start]').waitFor({ state: 'visible' });
    invariant((await page.locator('.intro h2').innerText()).includes('하윤'), 'desktop intro does not state the person to rescue');
    await page.screenshot({ path: path.join(OUT, 'desktop-intro.png'), fullPage: true });
    const initialBlockingDialogs = await page.locator('[role="dialog"]:visible').count();
    invariant(initialBlockingDialogs === 1, `desktop: expected one intro dialog, found ${initialBlockingDialogs}`);
    let firstCollectCoreActions = 0;
    await page.locator('[data-start]').click();
    firstCollectCoreActions += 1;
    invariant(await page.locator('[role="dialog"]:visible').count() === 0, 'desktop: intro did not leave a clear game screen');

    const critical = ['[data-open-detail]', '.turn.left', '.turn.right', 'header [data-bag]', 'header [data-journal]', 'header [data-pause]'];
    const desktop = await layout(page, critical);
    await requireLayout('desktop', desktop, 0.45);
    invariant(desktop.title.length > 1, 'desktop scene title missing');
    await page.screenshot({ path: path.join(OUT, 'desktop-game.png'), fullPage: true });

    const saveBeforeAction = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
    await page.locator('[data-open-detail]').click();
    firstCollectCoreActions += 1;
    await page.locator('[data-hotspot]').first().waitFor({ state: 'visible' });
    const hotspotLabel = await page.locator('[data-hotspot]').first().innerText();
    const feedbackStarted = Date.now();
    await page.locator('[data-hotspot]').first().click();
    firstCollectCoreActions += 1;
    await page.waitForFunction(([key, before]) => localStorage.getItem(key) !== before, [SAVE_KEY, saveBeforeAction]);
    const feedbackLatencyMs = Date.now() - feedbackStarted;
    invariant(feedbackLatencyMs <= 500, `inspection feedback took ${feedbackLatencyMs}ms`);
    const saveAfterAction = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
    invariant(saveAfterAction && saveAfterAction !== saveBeforeAction, 'inspection did not change the canonical save');
    invariant(await page.locator('.message').innerText() !== '', 'inspection produced no player feedback');
    invariant(firstCollectCoreActions <= 3, `first collection required ${firstCollectCoreActions} core actions`);
    await page.screenshot({ path: path.join(OUT, 'desktop-inspection.png'), fullPage: true });
    await page.keyboard.press('Escape');
    await page.locator('[data-open-detail]').click();
    invariant(await page.locator('[data-close-detail]:visible').count() >= 1, 'detail view has no clear exit');
    await page.keyboard.press('Escape');
    invariant(await page.locator('[data-close-detail]:visible').count() === 0, 'Escape did not exit detail view');
    invariant(await page.evaluate(() => document.activeElement?.matches('[data-open-detail]')),'detail exit did not restore focus to the originating action');

    const titleBeforePause = (await page.locator('.place h2').innerText()).trim();
    const saveBeforePause = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
    const blockedTurnBox = await page.locator('.turn.right').boundingBox();
    const blockedBagBox = await page.locator('header [data-bag]').boundingBox();
    invariant(blockedTurnBox && blockedBagBox, 'pause probe controls are not measurable');
    await page.locator('header [data-pause]').click();
    invariant(await page.locator('.pause-card[role="dialog"][aria-modal="true"]:visible').count() === 1, 'pause is not exposed as a modal dialog');
    await requireFocusWrap(page, '.pause-card:visible', 'pause');
    await page.mouse.click(blockedTurnBox.x + blockedTurnBox.width / 2, blockedTurnBox.y + blockedTurnBox.height / 2);
    await page.mouse.click(blockedBagBox.x + blockedBagBox.width / 2, blockedBagBox.y + blockedBagBox.height / 2);
    await page.keyboard.press('d');
    invariant((await page.locator('.place h2').innerText()).trim() === titleBeforePause, 'pause leaked scene navigation');
    invariant(await page.locator('.tool-belt:visible').count() === 0, 'pause leaked bag interaction');
    invariant(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY) === saveBeforePause, 'pause leaked a gameplay save mutation');
    await page.keyboard.press('Escape');
    invariant(await page.locator('.pause-card:visible').count() === 0, 'Escape did not resume from pause');
    invariant(await page.evaluate(() => document.activeElement?.matches('header [data-pause]')), 'pause exit did not restore focus to pause control');

    await page.locator('header [data-bag]').click();
    invariant(await page.locator('.tool-belt[role="dialog"][aria-modal="true"]:visible').count() === 1, 'bag is not exposed as a modal dialog');
    await requireFocusWrap(page, '.tool-belt:visible', 'bag');
    await page.keyboard.press('Escape');
    invariant(await page.locator('.tool-belt:visible').count() === 0, 'Escape did not close bag');
    invariant(await page.evaluate(() => document.activeElement?.matches('header [data-bag]')), 'bag exit did not restore focus to bag control');

    await page.locator('.turn.right').click();
    const movedTitle = (await page.locator('.place h2').innerText()).trim();
    invariant(movedTitle !== desktop.title, 'next-place control did not change location');
    const saveAfterMove = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    const rotationPromptShown = await page.locator('[data-dismiss-rotation]').isVisible();
    if (rotationPromptShown) await page.locator('[data-dismiss-rotation]').click();
    await page.locator('.game').evaluate((el) => { el.dataset.qaIdentity = 'rotation-stable'; });
    const portrait = await layout(page, critical);
    await requireLayout('portrait', portrait, 0.30);
    const tooSmall = portrait.critical.filter((item) => item.height < 36 || item.width < 36);
    invariant(tooSmall.length === 0, `portrait: critical touch targets below 36px: ${JSON.stringify(tooSmall)}`);
    const tinyPortraitText = portrait.critical.filter((item) => item.fontSize < 9);
    invariant(tinyPortraitText.length === 0, `portrait: critical labels below 9px: ${JSON.stringify(tinyPortraitText)}`);
    invariant(await page.locator('.route-board').count() === 0, 'removed parallel-route overlay is still present');
    await page.screenshot({ path: path.join(OUT, 'phone-portrait.png'), fullPage: true });

    await page.setViewportSize({ width: 320, height: 568 });
    await page.waitForTimeout(150);
    const shortPortrait = await layout(page, critical);
    await requireLayout('short portrait', shortPortrait, 0.30);
    const shortTooSmall = shortPortrait.critical.filter((item) => item.height < 36 || item.width < 36);
    invariant(shortTooSmall.length === 0, `short portrait: critical touch targets below 36px: ${JSON.stringify(shortTooSmall)}`);
    invariant(await page.locator('.route-board').count() === 0, 'short portrait: removed parallel-route overlay is still present');
    await page.screenshot({ path: path.join(OUT, 'phone-short-320x568.png'), fullPage: true });

    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(150);
    invariant(await page.locator('.game').getAttribute('data-qa-identity') === 'rotation-stable', 'portrait→landscape recreated the game root');
    const landscape = await layout(page, critical);
    await requireLayout('landscape', landscape, 0.65);
    invariant(landscape.title === movedTitle, 'portrait→landscape changed location');
    const tinyLandscapeText = landscape.critical.filter((item) => item.fontSize < 9);
    invariant(tinyLandscapeText.length === 0, `landscape: critical labels below 9px: ${JSON.stringify(tinyLandscapeText)}`);
    invariant(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY) === saveAfterMove, 'portrait→landscape changed canonical save');
    await page.screenshot({ path: path.join(OUT, 'phone-landscape.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    invariant(await page.locator('.game').getAttribute('data-qa-identity') === 'rotation-stable', 'landscape→portrait recreated the game root');
    invariant((await page.locator('.place h2').innerText()).trim() === movedTitle, 'landscape→portrait changed location');

    await page.reload({ waitUntil: 'networkidle' });
    invariant((await page.locator('.place h2').innerText()).trim() === movedTitle, 'reload did not restore location');
    invariant(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY) === saveAfterMove, 'reload changed canonical save');
    invariant(!(await page.locator('[data-dismiss-rotation]').isVisible()), 'dismissed rotation prompt repeated after reload');

    report.friction = { initialBlockingDialogs, firstCollectCoreActions, feedbackLatencyMs, escapeExitAndFocusRestore: true, pauseInputLeak: false, pauseFocusTrapAndRestore: true, bagDialogFocusTrapAndRestore: true, rotationPromptShown, rotationPromptDidNotRepeat: true };
    report.checks = { hotspotLabel, desktop, portrait, shortPortrait, landscape, movedTitle, saveChangedOnInspection: true, saveRestoredAfterReload: true, rotationPreservedRoot: true };
    invariant(report.consoleErrors.length === 0, `console errors: ${JSON.stringify(report.consoleErrors)}`);
    invariant(report.pageErrors.length === 0, `page errors: ${JSON.stringify(report.pageErrors)}`);
    invariant(report.badResponses.length === 0, `HTTP errors: ${JSON.stringify(report.badResponses)}`);
    report.finishedAt = new Date().toISOString();
    report.status = 'PASS';
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    report.finishedAt = new Date().toISOString();
    report.status = 'FAIL';
    report.failure = error.stack || String(error);
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    console.error(report.failure);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
