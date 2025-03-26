const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    });
    const page = await context.newPage();
    //await page.goto('https://your-target-website.com');
    await page.goto('https://clubfans-fcwc25.pp-tickets.fifa.com/');


    console.log(await page.content());
    await browser.close();
})();
