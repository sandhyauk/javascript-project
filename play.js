const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // Navigate to the Ticketmaster artist page
    await page.goto('https://www.ticketmaster.com/artist/2370909');

    // List of matches to find tickets for
    const matches = ['M04', 'M09', 'M017'];

    for (const match of matches) {
        console.log(`Processing match: ${match}`);

        // Click on the match link (modify the selector if needed)
        const matchSelector = `text=${match}`;
        await page.waitForSelector(matchSelector);
        await page.click(matchSelector);

        // Click "Find Tickets"
        await page.waitForSelector('text=Find Tickets');
        await page.click('text=Find Tickets');

        // Click "Unlock"
        await page.waitForSelector('text=Unlock');
        await page.click('text=Unlock');

        // List of promo codes
        const promoCodes = [
            '0LU6pd', '4UpOEa', '5DfnIg', '9t1OV5', 'a2R6bC',
            'C3eqcR', 'CiPpt8', 'd8TCMi', 'Fpdl9P', 'ghtlwW',
            'gvrqb0', 'H3fF7v', 'hzDTO3', 'ICMWtp', 'M9FtDh',
            'QteVJD', 'rbhjeV', 'rjtPHR', 'tjW0DY', 'tK2jRd',
            'WZ4rNc', 'xjwfl7', 'zANjmf', 'ZBjlqt', 'Zqud9X'
        ];

        for (const code of promoCodes) {
            // Enter promo code
            await page.waitForSelector('input[name="promoCode"]', { timeout: 5000 });
            await page.fill('input[name="promoCode"]', code);

            // Click "Unlock"
            await page.click('text=Unlock');

            // Wait for the unlock process (modify the timeout if needed)
            await page.waitForTimeout(2000);
        }

        console.log(`Completed unlocking for match: ${match}`);
    }

    console.log('Process completed.');
    // await browser.close();
})();
