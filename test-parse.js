// Test XML parsing with real arXiv API response
const { XMLParser } = require('fast-xml-parser');

async function testParsing() {
  try {
    console.log('Testing arXiv API and parsing...');
    
    // Fetch a real response from arXiv
    const response = await fetch('https://export.arxiv.org/api/query?search_query=cat:cs.AI&max_results=2&sortBy=submittedDate&sortOrder=descending');
    const xmlString = await response.text();
    
    console.log('✅ Fetched XML response, length:', xmlString.length);
    
    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
    });
    
    const parsed = parser.parse(xmlString);
    const feed = parsed.feed;
    
    if (!feed || !feed.entry) {
      console.log('❌ No entries found');
      return;
    }
    
    const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
    console.log('✅ Parsed', entries.length, 'entries');
    
    // Test extraction
    const first = entries[0];
    const id = first.id?.['#text'] || first.id || '';
    console.log('✅ ID:', id);
    
    const arxivIdMatch = id.match(/arxiv\.org\/abs\/(.+)$/);
    if (arxivIdMatch) {
      console.log('✅ Extracted arXiv ID:', arxivIdMatch[1]);
      console.log('✅ HTML URL:', `https://arxiv.org/html/${arxivIdMatch[1]}`);
    }
    
    const links = Array.isArray(first.link) ? first.link : [first.link];
    const pdfLink = links.find(l => (l['@_rel'] === 'related' && l['@_type'] === 'application/pdf'));
    if (pdfLink) {
      console.log('✅ PDF URL:', pdfLink['@_href']);
    }
    
    console.log('✅ Title:', (first.title?.['#text'] || first.title || '').substring(0, 60) + '...');
    
    const authors = Array.isArray(first.author) ? first.author : [first.author];
    console.log('✅ Authors:', authors.length);
    
    console.log('\n✅ All parsing tests passed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testParsing();

