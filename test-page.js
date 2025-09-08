import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to http://localhost:5177/...');
    await page.goto('http://localhost:5177/', { waitUntil: 'networkidle' });
    
    // Wait for React to mount
    await page.waitForTimeout(2000);
    
    // Check if the page has loaded
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check for any console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
      }
    });
    
    // Take a screenshot
    await page.screenshot({ path: 'page-screenshot.png' });
    console.log('Screenshot saved as page-screenshot.png');
    
    // Check if the root element exists
    const rootElement = await page.$('#root');
    if (rootElement) {
      console.log('✓ Root element found');
      
      // Check if React has rendered content
      const hasContent = await page.evaluate(() => {
        const root = document.getElementById('root');
        return root && root.children.length > 0;
      });
      
      if (hasContent) {
        console.log('✓ React app has rendered content');
      } else {
        console.log('✗ React app has not rendered content');
      }
    } else {
      console.log('✗ Root element not found');
    }
    
    // Check for any error messages on the page
    const errorElements = await page.$$('[class*="error"], [class*="Error"]');
    if (errorElements.length > 0) {
      console.log(`Found ${errorElements.length} error elements on the page`);
    } else {
      console.log('✓ No error elements found on the page');
    }
    
    console.log('\nPage verification complete!');
    
  } catch (error) {
    console.error('Error during page verification:', error);
  } finally {
    await browser.close();
  }
})();