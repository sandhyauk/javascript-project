const { chromium } = require('playwright');
const ProxyChain = require('proxy-chain');

(async () => {
    // Define a list of proxies
    const proxyList = [
        'http://user123:pass456@us-proxy1.com:8080',
        'http://user789:pass321@fr-proxy2.com:3128',
        'http://user555:pass999@sg-proxy3.com:8001'
    ];


    // Define different user agents for Google and Facebook
    const userAgents = {
        google: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36',
        facebook: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36'
    };

    // Define URLs to test
    const urlsToTest = [
        { url: 'https://www.google.com', userAgent: userAgents.google },
        { url: 'https://www.facebook.com', userAgent: userAgents.facebook }
    ];

    // Function to create and use a proxy with a specified user agent
    async function useProxy(proxyUrl, testCase) {
        const newProxy = await ProxyChain.anonymizeProxy(proxyUrl);

        const browser = await chromium.launch({
            headless: true,
            proxy: {
                server: newProxy
            }
        });

        const context = await browser.newContext({
            userAgent: testCase.userAgent
        });

        const page = await context.newPage();

        try {
            await page.goto(testCase.url);
            console.log(`Visited ${testCase.url} using proxy ${proxyUrl} with user-agent: ${testCase.userAgent}`);
            console.log(`Page Title: ${await page.title()}`);
        } catch (error) {
            console.error(`Error accessing ${testCase.url}:`, error);
        } finally {
            await browser.close();
            await ProxyChain.closeAnonymizedProxy(newProxy, true);
        }
    }

    // Loop through each proxy and each test case
    for (const proxy of proxyList) {
        for (const testCase of urlsToTest) {
            await useProxy(proxy, testCase);
        }
    }
})();
