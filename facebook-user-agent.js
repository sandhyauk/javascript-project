const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; SM-G960F Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.84 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/123.0.0.22.71;]'
    });
    const page = await context.newPage();
    //await page.goto('https://your-target-website.com');
    await page.goto('https://clubfans-fcwc25.pp-tickets.fifa.com/');

    console.log(await page.content());
    await browser.close();
})();
