const { chromium } = require('playwright');

(async () => {
    const proxyServer = 'http://user123:pass456@us-proxy1.com:8080'; // Replace with actual proxy

    const browser = await chromium.launch({
        headless: false,
        proxy: { server: proxyServer }
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://www.whatismyipaddress.com/');
    console.log('Using Proxy:', proxyServer);

    await browser.close();
})();
