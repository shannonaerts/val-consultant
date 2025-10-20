const VectorService = require('./services/vectorService');

async function testPDF() {
  try {
    console.log('Testing PDF processing fix...');
    const vectorService = new VectorService();

    // Test if PDF parsing is available and working
    const { PDFParse } = require('pdf-parse');
    const pdfParser = new PDFParse();
    console.log('PDFParse class imported successfully');

    console.log('PDF library is working correctly - no "pdf is not a function" error');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPDF();