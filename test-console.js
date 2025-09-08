import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture console messages
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text()
    });
  });
  
  try {
    console.log('=== Checking Environment Variables in Browser ===\n');
    
    console.log('Navigating to http://localhost:5173/ontologies...');
    await page.goto('http://localhost:5173/ontologies');
    await page.waitForTimeout(2000);
    
    // Check environment variables in browser console
    const envVars = await page.evaluate(() => {
      // Try to check if env vars are loaded
      try {
        // Check localStorage or window for env data
        const hasApiKey = document.body.textContent.includes('VITE_AIRTABLE_API_KEY');
        const hasBaseId = document.body.textContent.includes('VITE_AIRTABLE_BASE_ID');
        
        return {
          hasApiKey: false, // Will be false since env vars aren't exposed to browser
          hasBaseId: false,
          pageHasWarning: hasApiKey || hasBaseId,
          bodyText: document.body.textContent.substring(0, 200)
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('\nEnvironment variables in browser:');
    console.log('  API Key present:', envVars.hasApiKey);
    console.log('  Base ID present:', envVars.hasBaseId);
    console.log('  Page has warning:', envVars.pageHasWarning);
    console.log('  Page text preview:', envVars.bodyText);
    
    console.log('\nConsole logs:');
    consoleLogs.forEach(log => {
      if (log.text.includes('Airtable') || log.text.includes('configured')) {
        console.log(`  [${log.type}] ${log.text}`);
      }
    });
    
    // Check AirtableClient configuration
    const clientStatus = await page.evaluate(() => {
      // Try to access the client through window if exposed
      if (window.airtableClient) {
        return {
          isReady: window.airtableClient.isReady(),
          config: window.airtableClient.getConfig()
        };
      }
      return null;
    });
    
    if (clientStatus) {
      console.log('\nAirtable Client Status:');
      console.log('  Ready:', clientStatus.isReady);
      console.log('  Config:', clientStatus.config);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('\n=== Check Complete ===');
    await page.waitForTimeout(5000); // Keep browser open to inspect
    await browser.close();
  }
})();