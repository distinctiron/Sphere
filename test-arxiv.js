// Quick test script for arXiv API
const { XMLParser } = require('fast-xml-parser');

async function testArxiv() {
  try {
    console.log('Testing arXiv API fetch...');
    
    const date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dateString = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    
    const params = new URLSearchParams({
      search_query: `submittedDate:[${dateString} TO *]`,
      start: '0',
      max_results: '5',
      sortBy: 'submittedDate',
      sortOrder: 'descending',
    });
    
    const url = `https://export.arxiv.org/api/query?${params.toString()}`;
    console.log('Fetching from:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Sphere/1.0 (Research Companion)',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const xmlString = await response.text();
    console.log('Response length:', xmlString.length, 'bytes');
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
    });
    
    const parsed = parser.parse(xmlString);
    const feed = parsed.feed;
    
    if (!feed || !feed.entry) {
      console.log('No entries found');
      return;
    }
    
    const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
    console.log('Found', entries.length, 'entries');
    
    if (entries.length > 0) {
      const first = entries[0];
      console.log('\nFirst entry sample:');
      console.log('ID:', first.id?.['#text'] || first.id);
      console.log('Title:', first.title?.['#text'] || first.title);
      console.log('Summary length:', (first.summary?.['#text'] || first.summary || '').length);
    }
    
    console.log('\n✅ arXiv API test successful!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testArxiv();

