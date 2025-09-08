import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const API_KEY = process.env.VITE_AIRTABLE_API_KEY;
const BASE_ID = process.env.VITE_AIRTABLE_BASE_ID;

console.log('Testing Airtable API...\n');

// First test: List bases to verify API key
console.log('1. Testing API key by listing bases...');
fetch('https://api.airtable.com/v0/meta/bases', {
  headers: {
    'Authorization': `Bearer ${API_KEY}`
  }
})
.then(res => res.json())
.then(data => {
  if (data.bases) {
    console.log('✅ API key is valid!');
    console.log(`   Found ${data.bases.length} base(s)`);
    
    const targetBase = data.bases.find(b => b.id === BASE_ID);
    if (targetBase) {
      console.log(`✅ Base ${BASE_ID} found: "${targetBase.name}"`);
      console.log(`   Permissions: ${targetBase.permissionLevel}`);
      
      // Now test listing tables in the base
      console.log('\n2. Testing access to base tables...');
      return fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      });
    } else {
      console.log(`❌ Base ${BASE_ID} not found in your bases`);
      console.log('   Available bases:');
      data.bases.forEach(b => console.log(`   - ${b.id}: ${b.name}`));
    }
  } else {
    console.log('❌ Invalid API key or no bases found');
    console.log('Response:', data);
  }
})
.then(res => res && res.json())
.then(data => {
  if (data && data.tables) {
    console.log(`✅ Can access base tables! Found ${data.tables.length} table(s):`);
    data.tables.forEach(t => {
      console.log(`   - ${t.name} (${t.id})`);
    });
    
    // Check if Documents table exists
    const hasDocuments = data.tables.some(t => t.name === 'Documents');
    if (!hasDocuments) {
      console.log('\n⚠️  No "Documents" table found. Available tables are listed above.');
      console.log('   The dashboard expects tables named: Documents, Ontologies, Graphs');
    }
  } else if (data) {
    console.log('❌ Cannot access base tables');
    console.log('Response:', data);
  }
})
.catch(err => {
  console.error('❌ Error:', err.message);
});