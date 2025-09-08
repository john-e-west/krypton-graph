import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console logs
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));
  
  console.log('Checking if environment variables are loaded...\n');
  
  await page.goto('http://localhost:5174/ontologies', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Check for the warning message
  const hasWarning = await page.locator('text=/Airtable client not configured/').count();
  
  if (hasWarning > 0) {
    console.log('❌ Environment variables NOT loaded - warning still present');
    console.log('\nPlease:');
    console.log('1. Hard refresh your browser (Cmd+Shift+R)');
    console.log('2. Or open in a new incognito window');
  } else {
    console.log('✅ Environment variables LOADED successfully!');
    
    // Check for data
    const rows = await page.locator('tbody tr').count();
    if (rows > 0) {
      console.log(`✅ Found ${rows} ontologies from Airtable!`);
      
      // Get ontology names
      for (let i = 0; i < Math.min(rows, 5); i++) {
        const name = await page.locator('tbody tr').nth(i).locator('td').first().textContent();
        console.log(`   - ${name}`);
      }
    } else {
      const emptyMsg = await page.locator('text=/No ontologies found/').count();
      if (emptyMsg > 0) {
        console.log('ℹ️  No ontologies in database (but connection works)');
      }
    }
  }
  
  // Check console logs
  const airtableLogs = logs.filter(log => log.includes('Airtable'));
  if (airtableLogs.length > 0) {
    console.log('\nConsole logs:');
    airtableLogs.forEach(log => console.log(`  ${log}`));
  }
  
  await browser.close();
})();