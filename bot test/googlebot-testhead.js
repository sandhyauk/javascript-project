const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({
        headless: false // Runs with UI (headed mode)
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    //await page.goto('https://example.com');
    await page.goto('https://clubfans-fcwc25.pp-tickets.fifa.com/');

    // Wait to observe browser (optional)
    await page.waitForTimeout(5000);

    await browser.close();
})();
