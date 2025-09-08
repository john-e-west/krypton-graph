import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: join(__dirname, '.env') });

const API_KEY = process.env.VITE_AIRTABLE_API_KEY;
const BASE_ID = process.env.VITE_AIRTABLE_BASE_ID;

console.log('Testing Airtable connection...');
console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 20)}...` : 'NOT FOUND');
console.log('Base ID:', BASE_ID || 'NOT FOUND');

if (!API_KEY || !BASE_ID) {
  console.error('❌ Missing credentials in .env file');
  process.exit(1);
}

// Test the connection
fetch(`https://api.airtable.com/v0/${BASE_ID}/Documents?maxRecords=1`, {
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
})
.then(res => {
  console.log('Response status:', res.status);
  if (res.status === 200) {
    console.log('✅ Airtable connection successful!');
    return res.json();
  } else {
    console.error('❌ Connection failed with status:', res.status);
    return res.text();
  }
})
.then(data => {
  if (typeof data === 'object' && data.records) {
    console.log('✅ Successfully fetched data from Airtable');
    console.log('   Found', data.records.length, 'record(s) in Documents table');
  } else if (typeof data === 'string') {
    console.error('Error response:', data);
  }
})
.catch(err => {
  console.error('❌ Connection error:', err.message);
});