// Test OCR parsing with actual invoice text patterns
const testInvoiceTexts = [
  // Your Hero invoice format
  `SAI SHRIK AUTO Pvices
JAWAHARLAL NAGAR
TAX INVOICE

Invoice Number: 505553A2626062
Date: 03/01/2026

Net Amount (After Round Off): 10,848.00`,

  // Variation 1: Different spacing
  `Invoice No: 505553A2626062
Date: 03/01/2026
Amount: 10,848.00`,

  // Variation 2: With Order No
  `Customer Code: 500553-02-BC-122
Invoice No: 505553A2626062  
Order No: 500553-02-PSAD-0126
Amount: 10,848.00`,

  // Variation 3: OCR might read numbers as letters
  `Invoice No: 505553A2626O62
Date: 03/01/2026
Amount: 10,848.00`,
];

const invoiceNumberPatterns = [
  /invoice\s+no\.?\s*:?\s*([A-Z0-9]+?)(?:\s|$|\\n)/i,                   
  /invoice\s*no\.?\s*:?\s*([A-Z0-9]+)/i,                                 
  /invoice\s+number\s*:?\s*([A-Z0-9\-\/]+?)(?:\s|$)/i,                  
  /number\s*:?\s*([A-Z0-9]+?)(?:\s|$)/i,                                
  /inv\.?\s+(?:no\.?|number)?\s*:?\s*([A-Z0-9\-\/]+)/i,                
];

console.log('Testing OCR invoice number extraction\n');

testInvoiceTexts.forEach((text, idx) => {
  console.log(`\n--- Test ${idx + 1} ---`);
  console.log('Input text (first 100 chars):', text.substring(0, 100) + '...');
  
  let extracted = null;
  for (const pattern of invoiceNumberPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let num = match[1].trim().replace(/[^A-Z0-9\-\/]/gi, '');
      num = num.replace(/[\-\/]+$/, '');
      
      if (num.length >= 2 && num.length <= 30 && !num.match(/^(buyer|order|po|purchase|ack|arn|irn|gst|hsn|customer|credit)/i)) {
        extracted = num;
        break;
      }
    }
  }
  
  if (extracted) {
    console.log('✓ EXTRACTED:', extracted);
  } else {
    console.log('✗ FAILED - No invoice number found');
  }
});
