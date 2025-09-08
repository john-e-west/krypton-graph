// Simple test to verify dashboard is loading
fetch('http://localhost:5174/')
  .then(res => res.text())
  .then(html => {
    if (html.includes('root') && html.includes('Krypton Graph')) {
      console.log('✅ Dashboard HTML loads successfully')
      console.log('✅ Page title: Krypton Graph')
      console.log('\n📊 Dashboard should display:')
      console.log('- Dashboard title and connection status')
      console.log('- Stats cards (Documents, Ontologies, Graphs)')
      console.log('- Activity feed section')
      console.log('- Quick Actions buttons')
      console.log('\n⚠️  Note: If you see errors about Airtable connection,')
      console.log('   add your credentials to a .env file:')
      console.log('   VITE_AIRTABLE_API_KEY=your_key')
      console.log('   VITE_AIRTABLE_BASE_ID=your_base_id')
    } else {
      console.log('❌ Dashboard failed to load')
    }
  })
  .catch(err => console.error('Error:', err))